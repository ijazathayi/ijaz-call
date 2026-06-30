import { useState, useCallback } from 'react';
import './Login.css';

// ─── Configuration ────────────────────────────────────────────────────────────
// Replace with your actual Google OAuth 2.0 Client ID from:
// https://console.cloud.google.com/apis/credentials
const GOOGLE_CLIENT_ID = '61953097945-qovq5k9vqmqgumkem6qm58i3ku8q6jdv.apps.googleusercontent.com';

export default function Login({ onLogin }) {
  const [demoEmail, setDemoEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ── Google Sign-In callback ─────────────────────────────────────────────
  const handleGoogleSuccess = useCallback((response) => {
    const idToken = response.credential;

    // Decode JWT payload to get user info (without verification – server verifies)
    const payload = JSON.parse(atob(idToken.split('.')[1]));
    const userData = {
      email:   payload.email,
      name:    payload.name,
      picture: payload.picture,
    };

    onLogin(userData, idToken);
  }, [onLogin]);

  // Initialize Google Sign-In button when component renders
  const initGoogleButton = useCallback((node) => {
    if (!node || !window.google || GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID_HERE') return;
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleSuccess,
    });
    window.google.accounts.id.renderButton(node, {
      theme: 'filled_black',
      size: 'large',
      width: 320,
      text: 'signin_with',
      shape: 'pill',
    });
  }, [handleGoogleSuccess]);

  // ── Demo mode login ─────────────────────────────────────────────────────
  const handleDemoLogin = useCallback(async () => {
    const name = demoEmail.trim() || 'User';
    setLoading(true);
    setError('');

    // Build demo token (server accepts "demo_<name>" tokens without verification)
    const demoToken = `demo_${name.toLowerCase().replace(/\s+/g, '')}`;
    const userData = {
      email:   `${name.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
      name,
      picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=7c3aed&color=fff&size=128`,
    };

    setTimeout(() => {
      setLoading(false);
      onLogin(userData, demoToken);
    }, 800);
  }, [demoEmail, onLogin]);

  const isGoogleConfigured = GOOGLE_CLIENT_ID !== 'YOUR_GOOGLE_CLIENT_ID_HERE';

  return (
    <div className="login-root">
      {/* Animated orbs */}
      <div className="login-orb login-orb-1" aria-hidden="true" />
      <div className="login-orb login-orb-2" aria-hidden="true" />
      <div className="login-orb login-orb-3" aria-hidden="true" />

      <div className="login-card glass">
        {/* Logo */}
        <div className="login-logo" aria-hidden="true">
          <div className="login-logo-icon">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="16" fill="url(#lg1)" />
              <path d="M10 12.5c0-.83.67-1.5 1.5-1.5h9c.83 0 1.5.67 1.5 1.5v7c0 .83-.67 1.5-1.5 1.5h-9A1.5 1.5 0 0 1 10 19.5v-7Z" fill="rgba(255,255,255,0.9)"/>
              <path d="M22 14l4-2.5v9L22 18" fill="rgba(255,255,255,0.7)"/>
              <defs>
                <linearGradient id="lg1" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#7c3aed"/>
                  <stop offset="1" stopColor="#2563eb"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span className="login-logo-text gradient-text">IJAZ Call</span>
        </div>

        <h1 className="login-title">Welcome back</h1>
        <p className="login-subtitle">
          Connect with anyone using their Gmail address — voice &amp; video calls,
          with local recording.
        </p>

        {/* Google Sign-In */}
        {isGoogleConfigured ? (
          <div className="login-google-btn" ref={initGoogleButton} />
        ) : (
          <div className="login-google-placeholder">
            <svg width="20" height="20" viewBox="0 0 20 20">
              <path d="M19.6 10.23c0-.68-.06-1.36-.17-2H10v3.77h5.39a4.6 4.6 0 0 1-2 3.02v2.5h3.24c1.89-1.74 2.98-4.3 2.98-7.29Z" fill="#4285F4"/>
              <path d="M10 20c2.7 0 4.97-.9 6.62-2.43l-3.24-2.5c-.9.6-2.04.96-3.38.96-2.6 0-4.8-1.76-5.6-4.12H1.07v2.58A10 10 0 0 0 10 20Z" fill="#34A853"/>
              <path d="M4.4 11.91A6.03 6.03 0 0 1 4.08 10c0-.66.12-1.3.32-1.91V5.51H1.07A10.01 10.01 0 0 0 0 10c0 1.61.39 3.13 1.07 4.49l3.33-2.58Z" fill="#FBBC05"/>
              <path d="M10 3.96c1.47 0 2.79.5 3.82 1.5l2.87-2.87C14.96.9 12.7 0 10 0A10 10 0 0 0 1.07 5.51l3.33 2.58C5.2 5.72 7.4 3.96 10 3.96Z" fill="#EA4335"/>
            </svg>
            Sign in with Google
            <span className="login-google-note">(Configure Client ID in Login.jsx)</span>
          </div>
        )}

        <div className="login-divider">
          <span>or try demo mode</span>
        </div>

        {/* Demo Mode */}
        <div className="login-demo">
          <input
            id="demo-name-input"
            className="input"
            placeholder="Enter your display name..."
            value={demoEmail}
            onChange={e => setDemoEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleDemoLogin()}
          />
          <button
            id="demo-login-btn"
            className="btn btn-primary"
            onClick={handleDemoLogin}
            disabled={loading || !demoEmail.trim()}
          >
            {loading ? (
              <span className="login-spinner" />
            ) : (
              <>
                <span>🚀</span> Enter Demo
              </>
            )}
          </button>
        </div>

        {error && <p className="login-error">{error}</p>}

        <p className="login-hint">
          Demo mode lets you test locally — open two browser tabs with different names.
        </p>

        {/* Features row */}
        <div className="login-features">
          {[
            { icon: '🎙️', label: 'Voice Calls' },
            { icon: '📹', label: 'Video Calls' },
            { icon: '🔴', label: 'Recording' },
            { icon: '🔒', label: 'Secure P2P' },
          ].map(f => (
            <div key={f.label} className="login-feature-item">
              <span>{f.icon}</span>
              <span>{f.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
