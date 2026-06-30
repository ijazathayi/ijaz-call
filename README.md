# 📞 IJAZ Call — Gmail-Based WebRTC Calling App

A modern, full-stack calling app that uses **Gmail accounts** instead of phone numbers.  
Supports **voice calls**, **video calls**, and **local call recording** (saved to your device).

---

## 🚀 Quick Start (Demo Mode)

No Google Cloud setup needed for local testing!

### 1. Start the Signaling Server

```bash
cd server
npm install
npm start
```

Server runs at `http://localhost:5000`

### 2. Start the Client

```bash
cd client
npm install
npm run dev
```

Client runs at `http://localhost:5173`

### 3. Test a Call

1. Open **two browser tabs** at `http://localhost:5173`
2. In Tab 1 → enter name **"Alice"** → click **Enter Demo**
3. In Tab 2 → enter name **"Bob"** → click **Enter Demo**
4. In Alice's tab → hover over Bob in the contacts list
5. Click 📹 (video) or 🎙️ (voice) to call
6. In Bob's tab → click **Accept**
7. During call → click ⏺ to **record** → click ⏹ to save the `.webm` file

---

## 🔐 Google OAuth Setup (Production)

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a project → **Create Credentials** → **OAuth 2.0 Client ID**
3. Application type: **Web application**
4. Authorized JavaScript origins: `http://localhost:5173`
5. Copy your **Client ID**

Then update two files:

**`client/src/components/Auth/Login.jsx`** — line 8:
```js
const GOOGLE_CLIENT_ID = 'YOUR_ACTUAL_CLIENT_ID.apps.googleusercontent.com';
```

**`server/server.js`** — line 10:
```js
const GOOGLE_CLIENT_ID = 'YOUR_ACTUAL_CLIENT_ID.apps.googleusercontent.com';
```

---

## 📁 Project Structure

```
ijaz calling app/
├── server/
│   ├── server.js        ← Signaling server (Socket.io)
│   └── package.json
└── client/
    ├── src/
    │   ├── App.jsx              ← Root state machine
    │   ├── hooks/
    │   │   ├── useSocket.js     ← Socket.io
    │   │   ├── useWebRTC.js     ← RTCPeerConnection
    │   │   └── useRecording.js  ← MediaRecorder
    │   └── components/
    │       ├── Auth/Login.jsx
    │       ├── Dashboard/
    │       └── Call/
    └── package.json
```

## ✨ Features

| Feature | Details |
|---------|---------|
| 🔐 Auth | Google Sign-In or Demo mode |
| 👥 Contacts | Search by Gmail, see online/offline |
| 🎙️ Voice call | Audio-only P2P via WebRTC |
| 📹 Video call | HD video + audio P2P |
| 🔴 Recording | Both sides mixed, saved as `.webm` |
| 📵 End call | Notifies remote peer |
| 🔒 Security | All media is peer-to-peer, no server relay |
