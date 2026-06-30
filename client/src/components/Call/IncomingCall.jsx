import './IncomingCall.css';

const NO_PROFILE = '/no-profile.png';

export default function IncomingCall({ callerInfo, callType, onAccept, onReject }) {
  return (
    <div className="incoming-overlay">
      <div className="incoming-card glass">
        {/* Pulse rings */}
        <div className="incoming-rings-wrap" aria-hidden="true">
          <div className="incoming-ring incoming-ring-1" />
          <div className="incoming-ring incoming-ring-2" />
          <div className="incoming-ring incoming-ring-3" />
        </div>

        {/* Avatar */}
        <div className="incoming-avatar-wrap">
          <img
            className="avatar incoming-avatar"
            src={callerInfo.picture || NO_PROFILE}
            alt={callerInfo.name}
            onError={e => { e.currentTarget.src = NO_PROFILE; }}
          />
        </div>

        {/* Info */}
        <div className="incoming-info">
          <p className="incoming-label">
            {callType === 'video' ? '📹 Incoming video call' : '🎙️ Incoming voice call'}
          </p>
          <h2 className="incoming-name">{callerInfo.name}</h2>
          <p className="incoming-email">{callerInfo.email}</p>
        </div>

        {/* Actions */}
        <div className="incoming-actions">
          <div className="incoming-action-wrap">
            <button
              className="btn btn-danger btn-icon-lg incoming-action-btn"
              onClick={onReject}
              aria-label="Reject call"
            >
              📵
            </button>
            <span className="incoming-action-label">Decline</span>
          </div>
          <div className="incoming-action-wrap">
            <button
              className="btn btn-success btn-icon-lg incoming-action-btn"
              onClick={onAccept}
              aria-label="Accept call"
            >
              {callType === 'video' ? '📹' : '📞'}
            </button>
            <span className="incoming-action-label">Accept</span>
          </div>
        </div>
      </div>
    </div>
  );
}
