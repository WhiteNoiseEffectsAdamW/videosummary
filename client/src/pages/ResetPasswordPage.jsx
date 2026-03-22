import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <p className="auth-sub">Invalid reset link. <Link to="/forgot-password">Request a new one.</Link></p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Set new password</h1>
        {done ? (
          <>
            <p className="auth-sub">Password updated. You can now sign in.</p>
            <p className="auth-switch"><Link to="/login">Sign in</Link></p>
          </>
        ) : (
          <>
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>New password <span className="optional">(min 8 characters)</span></label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus />
              </div>
              {error && <div className="auth-error">{error}</div>}
              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? 'Saving…' : 'Set new password'}
              </button>
            </form>
            <p className="auth-switch"><Link to="/login">Back to sign in</Link></p>
          </>
        )}
      </div>
    </div>
  );
}
