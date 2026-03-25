import React, { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext.jsx';
import PopularChannelSelect from '../components/PopularChannelSelect.jsx';

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

  const [confirmRemove, setConfirmRemove] = useState(null); // { id, name }

  async function handleRemove(id, name) {
    setConfirmRemove({ id, name });
  }

  async function confirmRemoveChannel() {
    const { id, name } = confirmRemove;
    setConfirmRemove(null);
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
      setScanStatus({ name: ch.name, state: 'scanning' });
      fetch('/api/videos/scan', { method: 'POST', credentials: 'include' }).then(() => {
        setScanStatus((s) => s ? { ...s, state: 'done' } : null);
        setTimeout(() => setScanStatus(null), 5000);
      }).catch(() => setScanStatus(null));
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
          <span className="digest-toggle-sub">New videos from your channels, every morning at 7am ET</span>
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
            ? `Distilling recent videos from ${scanStatus.name}…`
            : `Done — check My Videos for new summaries.`}
        </div>
      )}

      <PopularChannelSelect
        followedNames={channels.map((c) => c.channel_name)}
        onAdd={handleAddPopular}
        disabled={!!addingPopular}
      />

      {loadError && <p className="auth-error">Couldn't load your channels. Please refresh.</p>}
      {channels.length === 0 && !loadError ? (
        <p className="empty-state">Add your first channel and we'll send you a digest tomorrow morning.</p>
      ) : (
        <ul className="channel-list">
          {channels.map((c) => {
            const digestOn = c.digest !== false;
            return (
              <li key={c.id} className="channel-item">
                <div className="channel-name">{(c.channel_name || c.channel_id).replace(/^@/, '')}</div>
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
      {confirmRemove && (
        <div className="modal-backdrop" onClick={() => setConfirmRemove(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Remove {confirmRemove.name}?</div>
            <p className="modal-body">You'll stop receiving new summaries from this channel. You can also just pause it if you want to come back later.</p>
            <div className="modal-actions">
              <button className="modal-btn-secondary" onClick={() => {
                const ch = channels.find((c) => c.id === confirmRemove.id);
                if (ch) handleToggleChannel(ch.id, true);
                setConfirmRemove(null);
                showToast('Feed paused');
              }}>Pause instead</button>
              <button className="modal-btn-danger" onClick={confirmRemoveChannel}>Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
