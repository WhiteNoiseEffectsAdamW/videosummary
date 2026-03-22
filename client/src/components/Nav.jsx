import React from 'react';
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
        <path d="M4 6h16M4 10h16M4 14h10M4 18h6"/>
      </svg>
    ),
  },
  {
    to: '/',
    label: 'Summarize',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="7"/>
        <path d="M21 21l-4-4"/>
      </svg>
    ),
  },
];

export default function Nav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  if (!user || pathname === '/welcome' || pathname.startsWith('/s/')) return null;

  return (
    <>
      {/* Desktop top nav */}
      <nav className="nav">
        <span className="nav-brand">VideoSummary</span>
        <div className="nav-links">
          {TABS.map((t) => (
            <Link key={t.to} className={`nav-link${pathname === t.to ? ' active' : ''}`} to={t.to}>
              {t.label}
            </Link>
          ))}
        </div>
        <div className="nav-right">
          <span className="nav-email">{user.email}</span>
          <button className="nav-logout" onClick={handleLogout}>Log out</button>
        </div>
      </nav>

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
        <button className="mobile-tab mobile-tab-logout" onClick={handleLogout}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          <span>Log out</span>
        </button>
      </nav>
    </>
  );
}
