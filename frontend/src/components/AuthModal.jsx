import { useState } from 'react';
import { X, ShieldCheck, Mail, Lock, User as UserIcon, LogIn, UserPlus, LogOut } from 'lucide-react';
import { loginUser, logoutUser, registerUser } from '../services/api';

export default function AuthModal({ isOpen, onClose, currentUser, onAuthSuccess }) {
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (tab === 'register') {
        const res = await registerUser(email, username, password);
        onAuthSuccess(res.user);
        onClose();
      } else {
        const res = await loginUser(email, password);
        onAuthSuccess(res.user);
        onClose();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    logoutUser();
    onAuthSuccess(null);
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <ShieldCheck size={20} className="modal-icon primary" />
            <h3>{currentUser ? 'User Account' : tab === 'login' ? 'Sign In to Nova' : 'Create Account'}</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {currentUser ? (
          <div className="modal-body">
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'var(--grad-primary)',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '22px',
                  fontWeight: 800,
                  color: '#fff',
                  margin: '0 auto 12px',
                }}
              >
                {currentUser.username[0]?.toUpperCase() || 'U'}
              </div>
              <strong style={{ fontSize: '16px', color: '#fff', display: 'block' }}>
                {currentUser.username}
              </strong>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{currentUser.email}</span>
            </div>

            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button type="button" className="btn-secondary" onClick={onClose}>
                Close
              </button>
              <button type="button" className="btn-primary btn-danger" onClick={handleLogout}>
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="modal-body">
            {/* Tabs */}
            <div className="filter-pill-group" style={{ marginBottom: '18px' }}>
              <button
                type="button"
                className={`filter-pill ${tab === 'login' ? 'active' : ''}`}
                onClick={() => {
                  setTab('login');
                  setError('');
                }}
                style={{ flex: 1, textAlign: 'center' }}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`filter-pill ${tab === 'register' ? 'active' : ''}`}
                onClick={() => {
                  setTab('register');
                  setError('');
                }}
                style={{ flex: 1, textAlign: 'center' }}
              >
                Register
              </button>
            </div>

            {error && <div className="error-banner" style={{ margin: '0 0 14px' }}>{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label>Email Address</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="custom-input"
                  />
                </div>
              </div>

              {tab === 'register' && (
                <div className="input-group">
                  <label>Full Name / Username</label>
                  <input
                    type="text"
                    required
                    placeholder="Your name"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="custom-input"
                  />
                </div>
              )}

              <div className="input-group">
                <label>Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="custom-input"
                />
              </div>

              <div className="modal-actions" style={{ marginTop: '22px' }}>
                <button type="button" className="btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Please wait...' : tab === 'login' ? 'Sign In' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
