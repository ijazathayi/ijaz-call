import { useState, useMemo } from 'react';
import Sidebar from './Sidebar';
import './Dashboard.css';

// Default avatar shown when no profile picture exists
const NO_PROFILE = '/no-profile.png';

function UserAvatar({ picture, name, size = 36, fontSize = 14, className = '' }) {
  const initials = name?.[0]?.toUpperCase() || '?';
  const style = { width: size, height: size, fontSize };

  if (picture) {
    return (
      <img
        className={`avatar ${className}`}
        src={picture}
        alt={name}
        width={size}
        height={size}
        onError={e => { e.currentTarget.src = NO_PROFILE; }}
      />
    );
  }
  return (
    <img
      className={`avatar ${className}`}
      src={NO_PROFILE}
      alt={name}
      width={size}
      height={size}
    />
  );
}

export default function Dashboard({ user, userList, onLogout, onCall, recordings, onDeleteRecording, formatSize }) {
  const [activeTab, setActiveTab] = useState('contacts');
  const [search,    setSearch]    = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const contacts = useMemo(() => {
    const q = search.toLowerCase();
    return userList
      .filter(u => u.email !== user.email)
      .filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [userList, user.email, search]);

  const onlineCount = useMemo(() => contacts.filter(c => c.online).length, [contacts]);

  return (
    <div className="dashboard">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Mobile top bar */}
      <div className="mobile-topbar">
        <div className="mobile-topbar-brand">
          <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="16" fill="url(#mob-lg)"/>
            <path d="M10 12.5c0-.83.67-1.5 1.5-1.5h9c.83 0 1.5.67 1.5 1.5v7c0 .83-.67 1.5-1.5 1.5h-9A1.5 1.5 0 0 1 10 19.5v-7Z" fill="rgba(255,255,255,0.9)"/>
            <path d="M22 14l4-2.5v9L22 18" fill="rgba(255,255,255,0.7)"/>
            <defs><linearGradient id="mob-lg" x1="0" y1="0" x2="32" y2="32"><stop stopColor="#7c3aed"/><stop offset="1" stopColor="#2563eb"/></linearGradient></defs>
          </svg>
          IJAZ Call
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {onlineCount > 0 && (
            <span style={{ fontSize:12, fontWeight:700, color:'var(--green)', background:'rgba(16,185,129,0.12)', padding:'3px 10px', borderRadius:'999px', border:'1px solid rgba(16,185,129,0.2)' }}>
              {onlineCount} online
            </span>
          )}
          <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu">☰</button>
        </div>
      </div>

      {/* ── Sidebar ── */}
      <aside className={`dashboard-sidebar glass ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          {/* Brand row */}
          <div className="sidebar-brand">
            <div className="sidebar-brand-icon">
              <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="16" fill="url(#db-lg)"/>
                <path d="M10 12.5c0-.83.67-1.5 1.5-1.5h9c.83 0 1.5.67 1.5 1.5v7c0 .83-.67 1.5-1.5 1.5h-9A1.5 1.5 0 0 1 10 19.5v-7Z" fill="rgba(255,255,255,0.9)"/>
                <path d="M22 14l4-2.5v9L22 18" fill="rgba(255,255,255,0.7)"/>
                <defs><linearGradient id="db-lg" x1="0" y1="0" x2="32" y2="32"><stop stopColor="#7c3aed"/><stop offset="1" stopColor="#2563eb"/></linearGradient></defs>
              </svg>
            </div>
            <span className="sidebar-brand-name">IJAZ Call</span>
            <button className="sidebar-close-btn" onClick={() => setSidebarOpen(false)} aria-label="Close menu">✕</button>
          </div>

          {/* User card */}
          <div className="sidebar-user">
            <div className="sidebar-user-avatar-wrap">
              <UserAvatar picture={user.picture} name={user.name} size={36} fontSize={14} className="avatar" />
              <span className="status-dot online" />
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user.name}</span>
              <span className="sidebar-user-email">{user.email}</span>
            </div>
            <button
              className="btn btn-ghost btn-icon"
              onClick={onLogout}
              data-tooltip="Sign out"
              style={{ fontSize:16, flexShrink:0 }}
            >
              ⏏
            </button>
          </div>

          {/* Tabs */}
          <div className="sidebar-tabs">
            <button
              className={`sidebar-tab ${activeTab === 'contacts' ? 'active' : ''}`}
              onClick={() => setActiveTab('contacts')}
            >
              Contacts
              {onlineCount > 0 && <span className="sidebar-tab-badge">{onlineCount}</span>}
            </button>
            <button
              className={`sidebar-tab ${activeTab === 'recordings' ? 'active' : ''}`}
              onClick={() => setActiveTab('recordings')}
            >
              Recordings
              {recordings.length > 0 && <span className="sidebar-tab-badge">{recordings.length}</span>}
            </button>
          </div>

          {/* Search */}
          {activeTab === 'contacts' && (
            <div className="sidebar-search">
              <span className="sidebar-search-icon">🔍</span>
              <input
                className="input"
                placeholder="Search by name or Gmail..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 36 }}
              />
            </div>
          )}
        </div>

        <div className="sidebar-content">
          {activeTab === 'contacts' ? (
            <Sidebar contacts={contacts} onCall={(c, t) => { onCall(c, t); setSidebarOpen(false); }} />
          ) : (
            <RecordingsList recordings={recordings} onDelete={onDeleteRecording} formatSize={formatSize} />
          )}
        </div>
      </aside>

      {/* ── Main panel ── */}
      <main className="dashboard-main">
        <WelcomePanel user={user} onlineCount={onlineCount} totalUsers={contacts.length} onOpenSidebar={() => setSidebarOpen(true)} />
      </main>
    </div>
  );
}

// ── Welcome Panel ─────────────────────────────────────────────────────────────
function WelcomePanel({ user, onlineCount, totalUsers, onOpenSidebar }) {
  return (
    <div className="welcome-panel">
      <div className="welcome-content">
        <div className="welcome-avatar-wrap">
          <div className="welcome-avatar-ring welcome-avatar-ring-1" />
          <div className="welcome-avatar-ring welcome-avatar-ring-2" />
          {user.picture ? (
            <img
              className="avatar welcome-avatar"
              src={user.picture}
              alt={user.name}
              width={96} height={96}
              onError={e => { e.currentTarget.src = '/no-profile.png'; }}
            />
          ) : (
            <img className="avatar welcome-avatar" src="/no-profile.png" alt={user.name} width={96} height={96} />
          )}
          <span className="status-dot online welcome-status-dot" />
        </div>

        <div>
          <h1 className="welcome-title">
            Hey, <span className="gradient-text">{user.name.split(' ')[0]}</span> 👋
          </h1>
          <p className="welcome-subtitle">{user.email}</p>
        </div>

        <div className="welcome-stats">
          <div className="welcome-stat glass-light">
            <span className="welcome-stat-num" style={{ color:'var(--green)' }}>{onlineCount}</span>
            <span className="welcome-stat-label">Online now</span>
          </div>
          <div className="welcome-stat glass-light">
            <span className="welcome-stat-num gradient-text">{totalUsers}</span>
            <span className="welcome-stat-label">Contacts</span>
          </div>
        </div>

        <div className="welcome-info glass-light" style={{ textAlign:'center' }}>
          <p>
            <span style={{ marginRight:6 }}>👈</span>
            Select a contact from the sidebar to start a call
          </p>
        </div>

        <div className="welcome-features">
          {[
            { icon:'🎙️', title:'Voice Calls',  desc:'Crystal-clear audio calls' },
            { icon:'📹', title:'Video Calls',  desc:'HD face-to-face video' },
            { icon:'🔴', title:'Record',       desc:'Save calls locally to your device' },
          ].map(f => (
            <div key={f.title} className="welcome-feature glass-light">
              <span className="welcome-feature-icon">{f.icon}</span>
              <div>
                <p className="welcome-feature-title">{f.title}</p>
                <p className="welcome-feature-desc">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Recordings List ───────────────────────────────────────────────────────────
function RecordingsList({ recordings, onDelete, formatSize }) {
  if (recordings.length === 0) {
    return (
      <div className="empty-state">
        <span style={{ fontSize:40 }}>🎬</span>
        <p>No recordings yet</p>
        <span>Hit the record button during a call</span>
      </div>
    );
  }
  return (
    <div className="recordings-list">
      {recordings.map(rec => (
        <div key={rec.id} className="recording-item glass-light">
          <div className="recording-icon">🔴</div>
          <div className="recording-info">
            <p className="recording-name">{rec.filename}</p>
            <p className="recording-meta">{formatSize(rec.size)} · {rec.date.toLocaleTimeString()}</p>
          </div>
          <div className="recording-actions">
            <a href={rec.url} download={rec.filename} className="btn btn-ghost btn-icon" data-tooltip="Download" style={{ fontSize:14 }}>⬇</a>
            <button className="btn btn-ghost btn-icon" onClick={() => onDelete(rec.id)} data-tooltip="Delete" style={{ fontSize:14, color:'var(--red)' }}>🗑</button>
          </div>
        </div>
      ))}
    </div>
  );
}
