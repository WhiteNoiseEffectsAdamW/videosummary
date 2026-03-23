import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState('verifying'); // verifying | success | error

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) { setStatus('error'); return; }

    fetch('/api/auth/verify-email', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.ok) {
          if (refreshUser) refreshUser();
          localStorage.removeItem('verifyBannerDismissed');
          setStatus('success');
        } else {
          setStatus('error');
        }
      })
      .catch(() => setStatus('error'));
  }, []);

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        {status === 'verifying' && <p style={{ color: '#64748b' }}>Verifying…</p>}
        {status === 'success' && (
          <>
            <h1 className="auth-title">Email verified ✓</h1>
            <p className="auth-sub">You're all set.</p>
            <Link to="/" className="btn-primary" style={{ display: 'inline-block', marginTop: 24 }}>Continue →</Link>
          </>
        )}
        {status === 'error' && (
          <>
            <h1 className="auth-title">Link expired</h1>
            <p className="auth-sub">This verification link is invalid or has expired.</p>
            <Link to="/" className="btn-primary" style={{ display: 'inline-block', marginTop: 24 }}>Go home →</Link>
          </>
        )}
      </div>
    </div>
  );
}
