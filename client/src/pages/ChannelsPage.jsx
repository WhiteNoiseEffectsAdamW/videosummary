import React, { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext.jsx';

const POPULAR_CHANNELS = [
  { name: 'Fireship', handle: '@Fireship', category: 'Tech & AI' },
  { name: 'Andrej Karpathy', handle: '@AndrejKarpathy', category: 'Tech & AI' },
  { name: 'Lex Fridman', handle: '@lexfridman', category: 'Tech & AI' },
  { name: 'MKBHD', handle: '@mkbhd', category: 'Tech & AI' },
  { name: 'Veritasium', handle: '@veritasium', category: 'Science & Learning' },
  { name: 'Kurzgesagt', handle: '@kurzgesagt', category: 'Science & Learning' },
  { name: 'CGP Grey', handle: '@CGPGrey', category: 'Science & Learning' },
  { name: '3Blue1Brown', handle: '@3blue1brown', category: 'Science & Learning' },
  { name: 'Cal Newport', handle: '@CalNewportMedia', category: 'Productivity' },
  { name: 'Ali Abdaal', handle: '@aliabdaal', category: 'Productivity' },
  { name: 'Huberman Lab', handle: '@hubermanlab', category: 'Health' },
  { name: 'Peter Attia', handle: '@PeterAttiaMD', category: 'Health' },
  { name: 'Graham Stephan', handle: '@GrahamStephan', category: 'Finance & Business' },
  { name: 'Y Combinator', handle: '@ycombinator', category: 'Finance & Business' },
  { name: 'Diary of a CEO', handle: '@TheDiaryOfACEO', category: 'Finance & Business' },
];

const POPULAR_CATEGORIES = ['Tech & AI', 'Science & Learning', 'Productivity', 'Health', 'Finance & Business'];

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
  const [previewSending, setPreviewSending] = useState(false);
  const [addingPopular, setAddingPopular] = useState(null);
  const [showPopular, setShowPopular] = useState(false);

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
      showToast(next ? 'Daily Digest enabled' : 'Daily Digest turned off');
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
      const raw = input.trim();
      const resolveUrl = raw.startsWith('@') ? `https://www.youtube.com/${raw}` : raw;
      const resolveRes = await fetch(`/api/channels/resolve?url=${encodeURIComponent(resolveUrl)}`, { credentials: 'include' });
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
      showToast(`✓ Added ${resolved.channelName || resolved.channelId} to your digest`);
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

  async function handlePreviewDigest() {
    setPreviewSending(true);
    try {
      const res = await fetch('/api/auth/preview-digest', { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (res.ok) showToast('Preview digest sent — check your inbox.');
      else showToast(data.error || 'Could not send preview.');
    } catch {
      showToast('Could not send preview.');
    } finally {
      setPreviewSending(false);
    }
  }

  async function handleAddPopular(ch) {
    setAddingPopular(ch.handle);
    try {
      const resolveRes = await fetch(`/api/channels/resolve?url=${encodeURIComponent(`https://www.youtube.com/${ch.handle}`)}`, { credentials: 'include' });
      const resolved = await resolveRes.json();
      if (!resolveRes.ok) throw new Error(resolved.error);
      const res = await fetch('/api/subscriptions', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId: resolved.channelId, channelName: ch.name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setChannels((prev) => [...prev, data]);
      showToast(`✓ Added ${ch.name} to your digest`);
    } catch (err) {
      showToast(err.message || 'Could not add channel.');
    } finally {
      setAddingPopular(null);
    }
  }

  const digestOn = user?.emailDigest !== false;

  return (
    <div className="page-inner">
      {toast && <div className="toast">{toast}</div>}
      <h1 className="page-title">Following</h1>

      {/* Email digest toggle */}
      <div className="digest-toggle-row">
        <div className="digest-toggle-info">
          <span className="digest-toggle-label">Daily Digest</span>
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

      <div className="digest-preview-row">
        <span className="digest-preview-sub">See what your morning digest looks like — we'll send one to your inbox now.</span>
        <button className="btn-preview-digest" onClick={handlePreviewDigest} disabled={previewSending}>
          {previewSending ? 'Sending…' : 'Send me a preview'}
        </button>
      </div>

      <form className="add-channel-form" onSubmit={handleAdd}>
        <div className="add-channel-inputs">
          <input
            className="url-input channel-url-input"
            type="text"
            placeholder="@CalNewportMedia or youtube.com/..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <button className="btn-summarize" type="submit" disabled={loading}>
            {loading ? 'Adding…' : 'Add to digest'}
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

      {/* Popular channels */}
      <div className="popular-channels">
        <button className="popular-channels-toggle" onClick={() => setShowPopular((v) => !v)}>
          Browse popular channels {showPopular ? '↑' : '↓'}
        </button>
        {showPopular && <>
        {POPULAR_CATEGORIES.map((cat) => {
          const catChannels = POPULAR_CHANNELS.filter((ch) => ch.category === cat);
          const followedIds = channels.map((c) => c.channel_name);
          const available = catChannels.filter((ch) => !followedIds.includes(ch.name));
          if (available.length === 0) return null;
          return (
            <div key={cat} className="popular-category">
              <div className="popular-category-label">{cat}</div>
              <div className="popular-channel-list">
                {available.map((ch) => (
                  <button
                    key={ch.handle}
                    className="popular-channel-btn"
                    onClick={() => handleAddPopular(ch)}
                    disabled={addingPopular === ch.handle}
                  >
                    {ch.name}
                    <span className="popular-channel-add">{addingPopular === ch.handle ? '…' : '+'}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
        </>}
      </div>

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
