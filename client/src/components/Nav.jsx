import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

const TABS = [
  {
    to: '/videos',
    label: 'My Videos',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <path d="M9 8l6 4-6 4V8z" fill="currentColor" stroke="none"/>
      </svg>
    ),
  },
  {
    to: '/following',
    label: 'Following',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
  {
    to: '/',
    label: 'Summarize',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        <line x1="9" y1="10" x2="15" y2="10"/>
        <line x1="9" y1="14" x2="13" y2="14"/>
      </svg>
    ),
  },
];

function VerifyBanner() {
  const { user } = useAuth();
  const [resent, setResent] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendError, setResendError] = useState(false);
  const [dismissed, setDismissed] = useState(() => !!localStorage.getItem('verifyBannerDismissed'));

  if (!user || user.emailVerified || dismissed) return null;

  async function handleResend() {
    setResending(true);
    setResendError(false);
    try {
      const res = await fetch('/api/auth/resend-verification', { method: 'POST', credentials: 'include' });
      if (res.ok) {
        setResent(true);
        setTimeout(() => setDismissed(true), 4000);
      } else {
        setResendError(true);
      }
    } catch {
      setResendError(true);
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="verify-banner">
      {resent
        ? 'Verification email sent — check your inbox.'
        : <>Check your email to verify your address.{' '}
            <button className="verify-banner-resend" onClick={handleResend} disabled={resending}>
              {resending ? 'Sending…' : resendError ? 'Failed — try again' : 'Resend'}
            </button>
            <button className="verify-banner-dismiss" onClick={() => { localStorage.setItem('verifyBannerDismissed', '1'); setDismissed(true); }}>✕</button>
          </>}
    </div>
  );
}

export default function Nav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const menuRef = React.useRef(null);

  React.useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
        setDeleteConfirm(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  async function handleDeleteAccount() {
    if (!deleteConfirm) { setDeleteConfirm(true); return; }
    setDeleting(true);
    try {
      await fetch('/api/auth/me', { method: 'DELETE', credentials: 'include' });
      await logout();
      navigate('/');
    } catch {
      setDeleting(false);
    }
  }

  if (!user || pathname === '/welcome') return null;

  return (
    <>
      {/* Desktop top nav */}
      <nav className="nav">
        <span className="nav-brand" onClick={() => setAboutOpen(true)}>Headwater</span>
        <div className="nav-links">
          {TABS.map((t) => (
            <Link key={t.to} className={`nav-link${pathname === t.to ? ' active' : ''}`} to={t.to}>
              {t.label}
            </Link>
          ))}
        </div>
        <div className="nav-right">
          <div className="nav-account-wrap" ref={menuRef}>
            <button className="nav-email-btn" onClick={() => { setMenuOpen((o) => !o); setDeleteConfirm(false); }}>
              {user.subscriptionStatus === 'pro' && <span className="nav-pro-badge">Pro</span>}
              {user.email} <span className="nav-email-caret">▾</span>
            </button>
            {menuOpen && (
              <div className="nav-account-menu">
                <Link className="nav-menu-item" to="/account" onClick={() => setMenuOpen(false)}>Account</Link>
                <Link className="nav-menu-item" to="/upgrade" onClick={() => setMenuOpen(false)}>
                  {user.subscriptionStatus === 'pro' ? 'Manage billing' : 'Upgrade to Pro'}
                </Link>
                <div className="nav-menu-divider" />
                <button className="nav-menu-item" onClick={handleLogout}>Sign out</button>
                <div className="nav-menu-divider" />
                {!deleteConfirm ? (
                  <button className="nav-menu-item nav-menu-danger" onClick={handleDeleteAccount}>Delete account</button>
                ) : (
                  <div className="nav-menu-delete-confirm">
                    <p>Are you sure? This can't be undone.</p>
                    <div className="nav-menu-delete-actions">
                      <button className="nav-menu-item nav-menu-danger" onClick={handleDeleteAccount} disabled={deleting}>
                        {deleting ? 'Deleting…' : 'Yes, delete'}
                      </button>
                      <button className="nav-menu-item" onClick={() => setDeleteConfirm(false)}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* About bottom sheet */}
      {aboutOpen && (
        <div className="about-backdrop" onClick={() => setAboutOpen(false)}>
          <div className="about-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="about-handle" />
            <div className="about-title">Headwater</div>
            <p className="about-body">You found this, so you're probably the kind of person I built it for.</p>
            <p className="about-body">Headwater exists because your attention belongs to you. Not to an algorithm.</p>
            <p className="about-body">Glad you're here. Reply to any email if something feels off. I read everything.</p>
            <p className="about-sig">Adam</p>
          </div>
        </div>
      )}

      {/* Mobile bottom tab bar */}
      <nav className="mobile-tabs">
        {TABS.map((t) => {
          const active = pathname === t.to;
          return (
            <Link key={t.to} to={t.to} className={`mobile-tab${active ? ' active' : ''}`}>
              {t.icon}
              <span>{t.label}</span>
            </Link>
          );
        })}
        <Link to="/account" className={`mobile-tab${pathname === '/account' ? ' active' : ''}`}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <circle cx="12" cy="9" r="3"/>
            <path d="M7 19.5c.8-2.5 2.7-4 5-4s4.2 1.5 5 4"/>
          </svg>
          <span>Account</span>
        </Link>
      </nav>
    </>
  );
}
