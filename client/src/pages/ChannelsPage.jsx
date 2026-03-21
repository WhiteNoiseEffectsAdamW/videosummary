import React, { useEffect, useState } from 'react';

export default function ChannelsPage() {
  const [channels, setChannels] = useState([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

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
      showToast(`✓ Added ${resolved.channelName || resolved.channelId}`);
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

  return (
    <div className="page-inner">
      {toast && <div className="toast">{toast}</div>}
      <h1 className="page-title">My Channels</h1>
      <p className="page-sub">Add channels below. We'll summarize new videos and email you each morning.</p>

      <form className="add-channel-form" onSubmit={handleAdd}>
        <div className="add-channel-inputs">
          <input
            className="url-input"
            type="text"
            placeholder="youtube.com/@CalNewportMedia"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
        </div>
        <button className="btn-summarize" type="submit" disabled={loading}>
          {loading ? 'Adding…' : 'Follow'}
        </button>
        {error && <div className="auth-error" style={{ marginTop: 8 }}>{error}</div>}
      </form>

      <p className="digest-next">Next digest: tomorrow at 7am UTC</p>

      {loadError && <p className="auth-error">Couldn't load your channels. Please refresh.</p>}
      {channels.length === 0 && !loadError ? (
        <p className="empty-state">No channels yet — add one above to get started.</p>
      ) : (
        <ul className="channel-list">
          {channels.map((c) => (
            <li key={c.id} className="channel-item">
              <div className="channel-name">{c.channel_name || c.channel_id}</div>
              <button className="btn-remove" onClick={() => handleRemove(c.id, c.channel_name || c.channel_id)}>Remove</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
