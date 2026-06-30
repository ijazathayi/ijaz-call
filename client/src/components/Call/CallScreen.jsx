import { useEffect, useRef, useState } from 'react';
import { CALL_STATE } from '../../App';
import './CallScreen.css';

const NO_PROFILE = '/no-profile.png';

export default function CallScreen({
  callState,
  callType,
  localStream,
  remoteStream,
  remoteUser,
  localUser,
  micMuted,
  camOff,
  isRecording,
  onToggleMic,
  onToggleCam,
  onEndCall,
  onStartRecording,
  onStopRecording,
}) {
  const localVideoRef  = useRef(null);
  const remoteVideoRef = useRef(null);

  // Attach local stream to local video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote stream to remote video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const isConnecting = callState === CALL_STATE.CALLING;
  const isVideo      = callType === 'video';

  const initials = (name) =>
    name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

  return (
    <div className="call-screen">
      {/* ── Background blur from remote video ── */}
      {isVideo && remoteStream && (
        <video
          className="call-bg-video"
          ref={el => { if (el) el.srcObject = remoteStream; }}
          autoPlay
          playsInline
          muted
          aria-hidden="true"
        />
      )}
      <div className="call-bg-overlay" />

      {/* ── Main remote view ── */}
      <div className="call-remote-area">
        {isVideo && remoteStream ? (
          <video
            id="remote-video"
            ref={remoteVideoRef}
            className="call-remote-video"
            autoPlay
            playsInline
          />
        ) : (
          /* Voice call / connecting — show avatar */
          <div className="call-avatar-hero">
            <div className="call-avatar-rings">
              <div className="call-ring call-ring-1" />
              <div className="call-ring call-ring-2" />
              <div className="call-ring call-ring-3" />
            </div>
            {remoteUser?.picture ? (
              <img
                className="avatar call-hero-avatar"
                src={remoteUser.picture}
                alt={remoteUser?.name}
                onError={e => { e.currentTarget.src = NO_PROFILE; }}
              />
            ) : (
              <img className="avatar call-hero-avatar" src={NO_PROFILE} alt={remoteUser?.name} />
            )}
          </div>
        )}

        {/* Remote user info */}
        <div className="call-remote-info">
          <h2 className="call-remote-name">{remoteUser?.name || 'Unknown'}</h2>
          <p className="call-remote-email">{remoteUser?.email}</p>
          <p className="call-status-text">
            {isConnecting ? (
              <span className="call-connecting">
                <span className="call-connecting-dot" />
                <span className="call-connecting-dot" style={{ animationDelay: '0.2s' }} />
                <span className="call-connecting-dot" style={{ animationDelay: '0.4s' }} />
                Calling...
              </span>
            ) : (
              <>
                {isVideo ? '📹' : '🎙️'}&nbsp;
                {isVideo ? 'Video' : 'Voice'} call in progress
              </>
            )}
          </p>
        </div>
      </div>

      {/* ── Local PiP video (video calls only) ── */}
      {isVideo && localStream && (
        <div className="call-pip">
          {camOff ? (
            <div className="call-pip-off">
              <img
                className="avatar"
                src={localUser?.picture || NO_PROFILE}
                alt="You"
                width={44} height={44}
                onError={e => { e.currentTarget.src = NO_PROFILE; }}
              />
              <span>Cam off</span>
            </div>
          ) : (
            <video
              id="local-video"
              ref={localVideoRef}
              className="call-pip-video"
              autoPlay
              playsInline
              muted
            />
          )}
          <div className="call-pip-label">You</div>
        </div>
      )}

      {/* ── Top bar ── */}
      <div className="call-top-bar">
        <div className="call-top-brand">
          <span className="call-top-logo">📞</span>
          <span>IJAZ Call</span>
        </div>

        {/* Recording badge */}
        {isRecording && (
          <div className="badge badge-recording">
            <span>●</span> Recording
          </div>
        )}

        <CallTimer active={!isConnecting} />
      </div>

      {/* ── Control Bar ── */}
      <div className="call-controls-wrap">
        <div className="call-controls glass">

          {/* Mic */}
          <button
            id="toggle-mic-btn"
            className={`btn btn-icon call-ctrl-btn ${micMuted ? 'call-ctrl-btn-off' : ''}`}
            onClick={onToggleMic}
            data-tooltip={micMuted ? 'Unmute mic' : 'Mute mic'}
          >
            {micMuted ? '🔇' : '🎤'}
          </button>

          {/* Camera (video calls only) */}
          {isVideo && (
            <button
              id="toggle-cam-btn"
              className={`btn btn-icon call-ctrl-btn ${camOff ? 'call-ctrl-btn-off' : ''}`}
              onClick={onToggleCam}
              data-tooltip={camOff ? 'Turn camera on' : 'Turn camera off'}
            >
              {camOff ? '🚫' : '📷'}
            </button>
          )}

          {/* Record */}
          {!isConnecting && (
            <button
              id="toggle-record-btn"
              className={`btn btn-icon call-ctrl-btn ${isRecording ? 'call-ctrl-btn-recording' : ''}`}
              onClick={isRecording ? onStopRecording : onStartRecording}
              data-tooltip={isRecording ? 'Stop recording' : 'Start recording'}
            >
              {isRecording ? '⏹' : '⏺'}
            </button>
          )}

          {/* Divider */}
          <div className="call-ctrl-divider" />

          {/* End Call */}
          <button
            id="end-call-btn"
            className="btn btn-danger btn-icon-lg call-ctrl-end"
            onClick={() => onEndCall(true)}
            data-tooltip="End call"
          >
            📵
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Simple call duration timer ────────────────────────────────────────────────
function CallTimer({ active }) {
  const [seconds, setSeconds] = useTimerState(active);

  const pad = n => String(n).padStart(2, '0');
  const h   = Math.floor(seconds / 3600);
  const m   = Math.floor((seconds % 3600) / 60);
  const s   = seconds % 60;

  return (
    <div className="call-timer">
      {h > 0 && `${pad(h)}:`}{pad(m)}:{pad(s)}
    </div>
  );
}

function useTimerState(active) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [active]);

  return [seconds, setSeconds];
}
