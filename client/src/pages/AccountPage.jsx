import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

export default function AccountPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [nudgeResult, setNudgeResult] = useState(null);
  const [nudging, setNudging] = useState(false);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  async function handleAdminNudge() {
    setNudging(true);
    setNudgeResult(null);
    try {
      const res = await fetch('/api/auth/admin-nudge-all', { method: 'POST', credentials: 'include' });
      const data = await res.json();
      setNudgeResult(data);
    } catch (err) {
      setNudgeResult({ error: err.message });
    } finally {
      setNudging(false);
    }
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

      <div className="account-section">
        <button className="account-btn" onClick={handleLogout}>Sign out</button>
      </div>

      {user?.email === 'whitear2@gmail.com' && (
        <div className="account-section">
          <button className="account-btn" onClick={handleAdminNudge} disabled={nudging}>
            {nudging ? 'Sending…' : 'Send nudge to all inactive users'}
          </button>
          {nudgeResult && (
            <pre style={{ fontSize: 12, color: '#64748b', marginTop: 12, whiteSpace: 'pre-wrap' }}>
              {JSON.stringify(nudgeResult, null, 2)}
            </pre>
          )}
        </div>
      )}

      <div className="account-danger-zone">
        {!deleteConfirm ? (
          <button className="account-btn account-btn-danger" onClick={() => setDeleteConfirm(true)}>
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
