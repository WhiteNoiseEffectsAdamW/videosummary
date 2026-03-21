import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

export default function Nav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  if (!user) return null;

  return (
    <nav className="nav">
      <span className="nav-brand">VideoSummary</span>
      <div className="nav-links">
        <Link className={`nav-link${pathname === '/videos' ? ' active' : ''}`} to="/videos">My Videos</Link>
        <Link className={`nav-link${pathname === '/channels' ? ' active' : ''}`} to="/channels">Channels</Link>
        <Link className={`nav-link${pathname === '/' ? ' active' : ''}`} to="/">Summarize</Link>
      </div>
      <div className="nav-right">
        <span className="nav-email">{user.email}</span>
        <button className="nav-logout" onClick={handleLogout}>Log out</button>
      </div>
    </nav>
  );
}
