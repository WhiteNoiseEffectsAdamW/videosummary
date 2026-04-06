import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

export default function AccountPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pwSent, setPwSent] = useState(false);
  const [pwSending, setPwSending] = useState(false);

  async function handleChangePassword() {
    setPwSending(true);
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      });
      setPwSent(true);
    } finally {
      setPwSending(false);
    }
  }

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await fetch('/api/auth/me', { method: 'DELETE', credentials: 'include' });
      await logout();
      navigate('/');
    } catch {
      setDeleting(false);
    }
  }

  return (
    <div className="page-inner">
      <h1 className="page-title">Account</h1>

      <div className="account-section">
        <div className="account-email">{user?.email}</div>
      </div>

      {/* Plan/billing section — hidden while free, re-enable with Stripe */}

      <div className="account-section">
        {pwSent
          ? <div className="account-pw-sent">Password reset email sent — check your inbox.</div>
          : <button className="account-btn" onClick={handleChangePassword} disabled={pwSending}>
              {pwSending ? 'Sending…' : 'Change password'}
            </button>}
      </div>

      <div className="account-section">
        <button className="account-btn" onClick={handleLogout}>Sign out</button>
      </div>


      <div className="account-danger-zone">
        {!deleteConfirm ? (
          <button className="account-delete-link" onClick={() => setDeleteConfirm(true)}>
            Delete account
          </button>
        ) : (
          <div className="account-delete-confirm">
            <p>This will permanently delete your account and all your data. This can't be undone.</p>
            <div className="account-delete-actions">
              <button className="account-btn account-btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Yes, permanently delete my account'}
              </button>
              <button className="account-btn" onClick={() => setDeleteConfirm(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
