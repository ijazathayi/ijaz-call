import { useState } from 'react';
import './ContactCard.css';

const NO_PROFILE = '/no-profile.png';

export default function ContactCard({ contact, onCall }) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className={`contact-card ${contact.online ? 'online' : 'offline'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onFocus={() => setShowActions(true)}
      onBlur={() => setShowActions(false)}
    >
      {/* Avatar */}
      <div className="contact-avatar-wrap">
        <img
          className="avatar contact-avatar"
          src={contact.picture || NO_PROFILE}
          alt={contact.name}
          width={44}
          height={44}
          onError={e => { e.currentTarget.src = NO_PROFILE; }}
        />
        <span className={`status-dot ${contact.online ? 'online' : 'offline'}`} />
      </div>

      {/* Info */}
      <div className="contact-info">
        <span className="contact-name">{contact.name}</span>
        <span className="contact-email">{contact.email}</span>
        {contact.online && <span className="contact-status-text">● Active now</span>}
      </div>

      {/* Call buttons — on hover for online contacts */}
      {contact.online ? (
        <div className={`contact-actions ${showActions ? 'visible' : ''}`}>
          <button
            className="btn btn-ghost btn-icon contact-call-btn"
            onClick={() => onCall(contact, 'voice')}
            data-tooltip="Voice Call"
          >
            🎙️
          </button>
          <button
            className="btn btn-primary btn-icon contact-call-btn"
            onClick={() => onCall(contact, 'video')}
            data-tooltip="Video Call"
          >
            📹
          </button>
        </div>
      ) : (
        <span className="contact-offline-badge">Offline</span>
      )}
    </div>
  );
}
