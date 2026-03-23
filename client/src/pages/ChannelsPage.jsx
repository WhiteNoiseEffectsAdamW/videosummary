import React, { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext.jsx';

export default function FollowingPage() {
  const { user, setUser } = useAuth();
  const [channels, setChannels] = useState([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [togglingDigest, setTogglingDigest] = useState(false);
  const [scanStatus, setScanStatus] = useState(null);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    fetch('/api/subscriptions', { credentials: 'include' })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then(setChannels)
      .catch(() => setLoadError(true));
  }, []);

  async function handleToggleDigest() {
    if (togglingDigest) return;
    setTogglingDigest(true);
    const next = !user.emailDigest;
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailDigest: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUser(data);
      showToast(next ? 'Daily digest enabled' : 'Daily digest turned off');
    } catch {
      showToast('Could not update preference. Please try again.');
    } finally {
      setTogglingDigest(false);
    }
  }

  async function handleAdd(e) {
    e.preventDefault();
    setError(null);
    if (!input.trim()) return;
    setLoading(true);
    try {
      const resolveRes = await fetch(`/api/channels/resolve?url=${encodeURIComponent(input.trim())}`, { credentials: 'include' });
      const resolved = await resolveRes.json();
      if (!resolveRes.ok) throw new Error(resolved.error);

      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId: resolved.channelId, channelName: resolved.channelName || resolved.channelId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setChannels((prev) => [...prev, data]);
      setInput('');
      showToast(`✓ Added ${resolved.channelName || resolved.channelId} to your signal`);
      // Kick off a background scan and show inline status
      setScanStatus({ name: resolved.channelName || resolved.channelId, state: 'scanning' });
      fetch('/api/videos/scan', { method: 'POST', credentials: 'include' }).then(() => {
        setScanStatus((s) => s ? { ...s, state: 'done' } : null);
        setTimeout(() => setScanStatus(null), 5000);
      }).catch(() => setScanStatus(null));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(id, name) {
    const res = await fetch(`/api/subscriptions/${id}`, { method: 'DELETE', credentials: 'include' });
    if (res.ok) {
      setChannels((prev) => prev.filter((c) => c.id !== id));
      showToast(`Removed ${name}`);
    } else {
      showToast('Could not remove channel. Please try again.');
    }
  }

  async function handleToggleChannel(id, current) {
    const next = !current;
    const res = await fetch(`/api/subscriptions/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ digest: next }),
    });
    if (res.ok) {
      setChannels((prev) => prev.map((c) => c.id === id ? { ...c, digest: next } : c));
    } else {
      showToast('Could not update channel. Please try again.');
    }
  }

  const digestOn = user?.emailDigest !== false;

  return (
    <div className="page-inner">
      {toast && <div className="toast">{toast}</div>}
      <h1 className="page-title">My Signal</h1>

      {/* Email digest toggle */}
      <div className="digest-toggle-row">
        <div className="digest-toggle-info">
          <span className="digest-toggle-label">Daily digest</span>
          <span className="digest-toggle-sub">New videos from your channels, every morning at 7am UTC</span>
        </div>
        <button
          className={`toggle-btn${digestOn ? ' toggle-on' : ''}`}
          onClick={handleToggleDigest}
          disabled={togglingDigest}
          aria-label={digestOn ? 'Turn off daily digest' : 'Turn on daily digest'}
        >
          <span className="toggle-knob" />
        </button>
      </div>

      <form className="add-channel-form" onSubmit={handleAdd}>
        <div className="add-channel-inputs">
          <input
            className="url-input channel-url-input"
            type="text"
            placeholder="youtube.com/@CalNewportMedia"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <button className="btn-summarize" type="submit" disabled={loading}>
            {loading ? 'Adding…' : 'Add to signal'}
          </button>
        </div>
        {error && <div className="auth-error" style={{ marginTop: 8 }}>{error}</div>}
      </form>

      {scanStatus && (
        <div className="scan-status">
          {scanStatus.state === 'scanning'
            ? `Scanning ${scanStatus.name} for recent videos…`
            : `Scan complete — check My Videos for new summaries.`}
        </div>
      )}

      {loadError && <p className="auth-error">Couldn't load your channels. Please refresh.</p>}
      {channels.length === 0 && !loadError ? (
        <p className="empty-state">No channels yet — add one above to get started.</p>
      ) : (
        <ul className="channel-list">
          {channels.map((c) => {
            const digestOn = c.digest !== false;
            return (
              <li key={c.id} className="channel-item">
                <div className="channel-name">{c.channel_name || c.channel_id}</div>
                <div className="channel-item-actions">
                  <button
                    className={`btn-digest-pill${digestOn ? ' pill-on' : ' pill-off'}`}
                    onClick={() => handleToggleChannel(c.id, digestOn)}
                  >
                    {digestOn ? 'Active' : 'Paused'}
                  </button>
                  <button className="btn-remove" onClick={() => handleRemove(c.id, c.channel_name || c.channel_id)}>Remove</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
