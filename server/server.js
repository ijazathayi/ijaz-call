const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { OAuth2Client } = require('google-auth-library');
const { v4: uuidv4 } = require('uuid');

// ─── Configuration ───────────────────────────────────────────────────────────
// IMPORTANT: Replace this with your actual Google OAuth 2.0 Client ID
// Get it from: https://console.cloud.google.com/apis/credentials
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '61953097945-qovq5k9vqmqgumkem6qm58i3ku8q6jdv.apps.googleusercontent.com';
const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// ─── App Setup ───────────────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

app.use(cors({ origin: '*' }));
app.use(express.json());

// ─── In-Memory User Store ────────────────────────────────────────────────────
// Maps email → { email, name, picture, socketId, online }
const users = new Map();

// Maps socketId → email (for disconnect lookup)
const socketToEmail = new Map();

// ─── REST API ────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Return list of all registered users (for contact search)
app.get('/api/users', (req, res) => {
  const userList = Array.from(users.values()).map(u => ({
    email: u.email,
    name: u.name,
    picture: u.picture,
    online: u.online,
  }));
  res.json(userList);
});

// ─── Socket.io Signaling ─────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[+] Socket connected: ${socket.id}`);

  // ── Authenticate ──────────────────────────────────────────────────────────
  // Client sends Google ID token; server verifies and registers user
  socket.on('authenticate', async ({ idToken }) => {
    try {
      let payload;

      // Allow dev/demo mode: if token starts with "demo_", skip verification
      if (idToken && idToken.startsWith('demo_')) {
        const parts = idToken.split('_');
        payload = {
          email: `${parts[1] || 'user'}@gmail.com`,
          name: parts[1] ? parts[1].charAt(0).toUpperCase() + parts[1].slice(1) : 'Demo User',
          picture: `https://ui-avatars.com/api/?name=${parts[1] || 'User'}&background=7c3aed&color=fff`,
          sub: uuidv4(),
        };
      } else {
        const ticket = await googleClient.verifyIdToken({
          idToken,
          audience: GOOGLE_CLIENT_ID,
        });
        payload = ticket.getPayload();
      }

      const { email, name, picture, sub } = payload;

      // Register / update user
      const userData = { email, name, picture, socketId: socket.id, online: true, sub };
      users.set(email, userData);
      socketToEmail.set(socket.id, email);

      socket.userEmail = email;
      socket.join(`user:${email}`);

      console.log(`[Auth] ${name} <${email}> authenticated`);

      // Confirm auth to client
      socket.emit('authenticated', { email, name, picture });

      // Send the current user list directly to this client first,
      // then broadcast the updated list to everyone else.
      const userList = Array.from(users.values()).map(u => ({
        email: u.email,
        name: u.name,
        picture: u.picture,
        online: u.online,
      }));
      socket.emit('user-list-updated', userList);
      broadcastUserList();
    } catch (err) {
      console.error('[Auth Error]', err.message);
      socket.emit('auth-error', { message: 'Authentication failed. Invalid token.' });
    }
  });

  // ── Request current user list (e.g. after reconnect) ────────────────────
  socket.on('request-user-list', () => {
    const userList = Array.from(users.values()).map(u => ({
      email: u.email,
      name: u.name,
      picture: u.picture,
      online: u.online,
    }));
    socket.emit('user-list-updated', userList);
  });

  // ── Call User ─────────────────────────────────────────────────────────────
  socket.on('call-user', ({ targetEmail, callType, callerInfo }) => {
    const target = users.get(targetEmail);
    if (!target || !target.online) {
      socket.emit('call-failed', { reason: 'User is offline or not found.' });
      return;
    }
    console.log(`[Call] ${callerInfo.email} → ${targetEmail} (${callType})`);
    io.to(`user:${targetEmail}`).emit('incoming-call', {
      callerInfo,
      callType,
      callId: uuidv4(),
    });
  });

  // ── Call Answered ─────────────────────────────────────────────────────────
  socket.on('call-answered', ({ targetEmail, callerInfo }) => {
    io.to(`user:${targetEmail}`).emit('call-answered', { answererInfo: callerInfo });
  });

  // ── Call Rejected ─────────────────────────────────────────────────────────
  socket.on('call-rejected', ({ targetEmail, reason }) => {
    io.to(`user:${targetEmail}`).emit('call-rejected', { reason: reason || 'Call declined.' });
  });

  // ── WebRTC Offer ──────────────────────────────────────────────────────────
  socket.on('webrtc-offer', ({ targetEmail, offer }) => {
    io.to(`user:${targetEmail}`).emit('webrtc-offer', {
      offer,
      senderEmail: socket.userEmail,
    });
  });

  // ── WebRTC Answer ─────────────────────────────────────────────────────────
  socket.on('webrtc-answer', ({ targetEmail, answer }) => {
    io.to(`user:${targetEmail}`).emit('webrtc-answer', { answer });
  });

  // ── ICE Candidate ─────────────────────────────────────────────────────────
  socket.on('ice-candidate', ({ targetEmail, candidate }) => {
    io.to(`user:${targetEmail}`).emit('ice-candidate', { candidate });
  });

  // ── End Call ──────────────────────────────────────────────────────────────
  socket.on('end-call', ({ targetEmail }) => {
    io.to(`user:${targetEmail}`).emit('call-ended');
    console.log(`[End] ${socket.userEmail} ended call with ${targetEmail}`);
  });

  // ── Disconnect ────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const email = socketToEmail.get(socket.id);
    if (email && users.has(email)) {
      users.get(email).online = false;
      socketToEmail.delete(socket.id);
      console.log(`[-] ${email} disconnected`);
      broadcastUserList();
    }
  });
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
function broadcastUserList() {
  const userList = Array.from(users.values()).map(u => ({
    email: u.email,
    name: u.name,
    picture: u.picture,
    online: u.online,
  }));
  io.emit('user-list-updated', userList);
}

// ─── Start ───────────────────────────────────────────────────────────────────
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Signaling server running at http://localhost:${PORT}`);
  console.log(`   Accessible on network at: http://[your-ip]:${PORT}`);
  console.log(`   Client origin: ${CLIENT_ORIGIN}`);
  console.log(`   Google Client ID: ${GOOGLE_CLIENT_ID.substring(0, 20)}...`);
});
