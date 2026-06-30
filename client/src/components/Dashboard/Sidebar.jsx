import ContactCard from './ContactCard';
import './Sidebar.css';

export default function Sidebar({ contacts, onCall, currentUserEmail }) {
  const online  = contacts.filter(c => c.online);
  const offline = contacts.filter(c => !c.online);

  if (contacts.length === 0) {
    return (
      <div className="empty-state">
        <span style={{ fontSize: 40 }}>👥</span>
        <p>No contacts yet</p>
        <span>Open another browser tab and sign in with a different name to see them here</span>
      </div>
    );
  }

  return (
    <div className="contacts-list">
      {online.length > 0 && (
        <>
          <div className="contacts-section-label">
            <span className="status-dot online" /> Online — {online.length}
          </div>
          {online.map(c => (
            <ContactCard key={c.email} contact={c} onCall={onCall} />
          ))}
        </>
      )}

      {offline.length > 0 && (
        <>
          <div className="contacts-section-label" style={{ marginTop: online.length ? 16 : 0 }}>
            <span className="status-dot offline" /> Offline — {offline.length}
          </div>
          {offline.map(c => (
            <ContactCard key={c.email} contact={c} onCall={onCall} />
          ))}
        </>
      )}
    </div>
  );
}
