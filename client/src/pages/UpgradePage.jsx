import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

export default function UpgradePage() {
  const { user, setUser } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState(null);
  const success = searchParams.get('success') === 'true';
  const isPro = user?.subscriptionStatus === 'pro';

  // Refresh user status after successful payment
  useEffect(() => {
    if (!success) return;
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setUser(data); })
      .catch(() => {});
  }, [success]);

  async function handleUpgrade() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/billing/checkout', { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not start checkout.');
      window.location.href = data.url;
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  async function handleManageBilling() {
    setPortalLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not open billing portal.');
      window.location.href = data.url;
    } catch (err) {
      setError(err.message);
      setPortalLoading(false);
    }
  }

  return (
    <div className="page-inner upgrade-page">
      {success && !isPro && (
        <div className="upgrade-success-banner">
          Payment received — your Pro plan is activating. This may take a moment.
        </div>
      )}
      {success && isPro && (
        <div className="upgrade-success-banner upgrade-success-active">
          You're on Pro. Welcome to unlimited channels and full history.
        </div>
      )}

      <h1 className="page-title">Plans</h1>

      <div className="pricing-cards">
        {/* Free tier */}
        <div className={`pricing-card${!isPro ? ' pricing-card-current' : ''}`}>
          <div className="pricing-card-header">
            <span className="pricing-tier-name">Free</span>
            {!isPro && <span className="pricing-current-badge">Current plan</span>}
          </div>
          <div className="pricing-price">$0<span className="pricing-period"> / month</span></div>
          <ul className="pricing-features">
            <li>Unlimited manual summaries</li>
            <li>Up to 3 followed channels</li>
            <li>7-day video history</li>
            <li>Daily digest email</li>
          </ul>
        </div>

        {/* Pro tier */}
        <div className={`pricing-card pricing-card-pro${isPro ? ' pricing-card-current' : ''}`}>
          <div className="pricing-card-header">
            <span className="pricing-tier-name">Pro</span>
            {isPro ? (
              <span className="pricing-current-badge pricing-current-badge-pro">Current plan</span>
            ) : (
              <span className="pricing-popular-badge">Upgrade</span>
            )}
          </div>
          <div className="pricing-price">$15<span className="pricing-period"> / month</span></div>
          <ul className="pricing-features">
            <li>Everything in Free</li>
            <li>Unlimited followed channels</li>
            <li>Full video history</li>
            <li>Priority support</li>
          </ul>
          {isPro ? (
            <button className="btn-manage-billing" onClick={handleManageBilling} disabled={portalLoading}>
              {portalLoading ? 'Opening…' : 'Manage billing'}
            </button>
          ) : (
            <button className="btn-upgrade" onClick={handleUpgrade} disabled={loading}>
              {loading ? 'Redirecting…' : 'Upgrade to Pro →'}
            </button>
          )}
        </div>
      </div>

      {error && <div className="auth-error" style={{ marginTop: 16 }}>{error}</div>}
    </div>
  );
}
