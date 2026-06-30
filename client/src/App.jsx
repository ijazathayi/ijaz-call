import { useState, useEffect, useRef, useCallback } from 'react';
import Login from './components/Auth/Login';
import Dashboard from './components/Dashboard/Dashboard';
import IncomingCall from './components/Call/IncomingCall';
import CallScreen from './components/Call/CallScreen';
import { useSocket } from './hooks/useSocket';
import { useWebRTC } from './hooks/useWebRTC';
import { useRecording } from './hooks/useRecording';

export const CALL_STATE = {
  IDLE:    'IDLE',
  RINGING: 'RINGING',
  CALLING: 'CALLING',
  ACTIVE:  'ACTIVE',
};

// ── Session helpers ───────────────────────────────────────────────────────────
function loadPersistedUser() {
  try {
    const raw = localStorage.getItem('ijaz_call_user');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function loadPersistedToken() {
  return localStorage.getItem('ijaz_call_token') || null;
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [user,         setUser]         = useState(() => loadPersistedUser());
  const [userList,     setUserList]     = useState([]);
  const [callState,    setCallState]    = useState(CALL_STATE.IDLE);
  const [callType,     setCallType]     = useState('video');
  const [remoteUser,   setRemoteUser]   = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [localStream,  setLocalStream]  = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [micMuted,     setMicMuted]     = useState(false);
  const [camOff,       setCamOff]       = useState(false);

  const localStreamRef  = useRef(null);
  const remoteStreamRef = useRef(null);
  const endCallRef      = useRef(null);

  const { socketRef, connect, disconnect, emit, on } = useSocket();
  const { isRecording, recordings, startRecording, stopRecording, deleteRecording, formatSize } =
    useRecording();

  // ── Media ─────────────────────────────────────────────────────────────────
  const startLocalStream = useCallback(async (type) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video' ? { width: 1280, height: 720, facingMode: 'user' } : false,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.error('[Media] getUserMedia failed:', err);
      alert('Could not access camera/microphone. Please check permissions.');
      return null;
    }
  }, []);

  const stopLocalStream = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }
  }, []);

  // ── WebRTC ────────────────────────────────────────────────────────────────
  const handleRemoteStream = useCallback((stream) => {
    remoteStreamRef.current = stream;
    setRemoteStream(stream);
  }, []);

  const handleCallEndedByPeer = useCallback(() => {
    endCallRef.current?.(false);
  }, []);

  const { createOffer, handleOffer, handleAnswer, handleIceCandidate, closePeerConnection } =
    useWebRTC({
      socketRef,
      localStreamRef,
      onRemoteStream: handleRemoteStream,
      onCallEnded: handleCallEndedByPeer,
    });

  // ── STEP 1: Register all socket listeners on mount (before any connect) ───
  // This MUST run before connect() so no server response is missed.
  useEffect(() => {
    const off1  = on('authenticated',     ({ email }) =>
      console.log('[Socket] authenticated as', email));

    const off2  = on('user-list-updated', (list) => {
      console.log('[Socket] user-list-updated, count:', list.length);
      setUserList(list);
    });

    const off3  = on('incoming-call', ({ callerInfo, callType: ct, callId }) => {
      setIncomingCall({ callerInfo, callType: ct, callId });
      setCallState(CALL_STATE.RINGING);
    });

    const off4  = on('call-answered', async ({ answererInfo }) => {
      setCallState(CALL_STATE.ACTIVE);
      await createOffer(answererInfo.email);
    });

    const off5  = on('call-rejected', ({ reason }) => {
      console.log('[Socket] call rejected:', reason);
      stopLocalStream();
      setCallState(CALL_STATE.IDLE);
      setRemoteUser(null);
    });

    const off6  = on('webrtc-offer',  async ({ offer, senderEmail }) =>
      handleOffer(offer, senderEmail));

    const off7  = on('webrtc-answer', async ({ answer }) =>
      handleAnswer(answer));

    const off8  = on('ice-candidate', async ({ candidate }) =>
      handleIceCandidate(candidate));

    const off9  = on('call-ended',  () => endCallRef.current?.(false));
    const off10 = on('call-failed', ({ reason }) => {
      endCallRef.current?.(false);
      alert(reason);
    });

    const off11 = on('auth-error', ({ message }) => {
      console.error('[Socket] auth error:', message);
    });

    // ── STEP 2: Connect & authenticate after listeners are ready ─────────
    const token = loadPersistedToken();
    const saved = loadPersistedUser();
    if (saved && token) {
      connect(() => {
        console.log('[Socket] connected, sending authenticate (restore)');
        emit('authenticate', { idToken: token });
      });
    }

    return () => {
      off1(); off2(); off3(); off4(); off5();
      off6(); off7(); off8(); off9(); off10(); off11();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ← empty deps: register once, stays alive for the whole session

  // ── Auth actions ──────────────────────────────────────────────────────────
  const handleLogin = useCallback((userData, idToken) => {
    localStorage.setItem('ijaz_call_user', JSON.stringify(userData));
    localStorage.setItem('ijaz_call_token', idToken);
    setUser(userData);
    connect(() => {
      console.log('[Socket] connected, sending authenticate (login)');
      emit('authenticate', { idToken });
    });
  }, [connect, emit]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('ijaz_call_user');
    localStorage.removeItem('ijaz_call_token');
    closePeerConnection();
    stopLocalStream();
    disconnect();
    setUser(null);
    setUserList([]);
    setCallState(CALL_STATE.IDLE);
    setRemoteUser(null);
    setIncomingCall(null);
  }, [disconnect, closePeerConnection, stopLocalStream]);

  // ── Call actions ──────────────────────────────────────────────────────────
  const endCall = useCallback((notify = true) => {
    if (isRecording) stopRecording();
    if (notify && remoteUser) emit('end-call', { targetEmail: remoteUser.email });
    closePeerConnection();
    stopLocalStream();
    setRemoteStream(null);
    remoteStreamRef.current = null;
    setCallState(CALL_STATE.IDLE);
    setRemoteUser(null);
    setIncomingCall(null);
    setMicMuted(false);
    setCamOff(false);
  }, [isRecording, stopRecording, remoteUser, emit, closePeerConnection, stopLocalStream]);

  useEffect(() => { endCallRef.current = endCall; }, [endCall]);

  const initiateCall = useCallback(async (targetUser, type) => {
    setCallType(type);
    setRemoteUser(targetUser);
    setCallState(CALL_STATE.CALLING);
    const stream = await startLocalStream(type);
    if (!stream) { setCallState(CALL_STATE.IDLE); setRemoteUser(null); return; }
    emit('call-user', {
      targetEmail: targetUser.email,
      callType: type,
      callerInfo: { email: user.email, name: user.name, picture: user.picture },
    });
  }, [emit, user, startLocalStream]);

  const acceptCall = useCallback(async () => {
    if (!incomingCall) return;
    const { callerInfo, callType: ct } = incomingCall;
    setCallType(ct);
    setRemoteUser(callerInfo);
    const stream = await startLocalStream(ct);
    if (!stream) { setCallState(CALL_STATE.IDLE); setIncomingCall(null); return; }
    setCallState(CALL_STATE.ACTIVE);
    setIncomingCall(null);
    emit('call-answered', {
      targetEmail: callerInfo.email,
      callerInfo: { email: user.email, name: user.name, picture: user.picture },
    });
  }, [incomingCall, startLocalStream, emit, user]);

  const rejectCall = useCallback(() => {
    if (!incomingCall) return;
    emit('call-rejected', {
      targetEmail: incomingCall.callerInfo.email,
      reason: 'Call declined.',
    });
    setCallState(CALL_STATE.IDLE);
    setIncomingCall(null);
  }, [incomingCall, emit]);

  // ── Media controls ────────────────────────────────────────────────────────
  const toggleMic = useCallback(() => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setMicMuted(m => !m);
  }, []);

  const toggleCamera = useCallback(() => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setCamOff(c => !c);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="bg-mesh" aria-hidden="true" />

      {!user ? (
        <Login onLogin={handleLogin} />
      ) : callState === CALL_STATE.ACTIVE || callState === CALL_STATE.CALLING ? (
        <CallScreen
          callState={callState}
          callType={callType}
          localStream={localStream}
          remoteStream={remoteStream}
          remoteUser={remoteUser}
          localUser={user}
          micMuted={micMuted}
          camOff={camOff}
          isRecording={isRecording}
          onToggleMic={toggleMic}
          onToggleCam={toggleCamera}
          onEndCall={endCall}
          onStartRecording={() => startRecording(localStream, remoteStream)}
          onStopRecording={stopRecording}
        />
      ) : (
        <Dashboard
          user={user}
          userList={userList}
          onLogout={handleLogout}
          onCall={initiateCall}
          recordings={recordings}
          onDeleteRecording={deleteRecording}
          formatSize={formatSize}
        />
      )}

      {callState === CALL_STATE.RINGING && incomingCall && (
        <IncomingCall
          callerInfo={incomingCall.callerInfo}
          callType={incomingCall.callType}
          onAccept={acceptCall}
          onReject={rejectCall}
        />
      )}
    </>
  );
}
