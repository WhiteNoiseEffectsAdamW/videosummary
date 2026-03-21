import React, { useEffect, useState } from 'react';

function extractChannelId(input) {
  input = input.trim();
  // Direct channel ID
  if (/^UC[\w-]{22}$/.test(input)) return input;
  // youtube.com/channel/UCxxxxx
  const m = input.match(/youtube\.com\/channel\/(UC[\w-]{22})/);
  if (m) return m[1];
  return null;
}

export default function ChannelsPage() {
  const [channels, setChannels] = useState([]);
  const [input, setInput] = useState('');
  const [channelName, setChannelName] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/subscriptions', { credentials: 'include' })
      .then((r) => r.ok ? r.json() : [])
      .then(setChannels)
      .catch(() => {});
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    setError(null);
    const channelId = extractChannelId(input);
    if (!channelId) {
      setError('Paste a channel URL (youtube.com/channel/UC…) or a channel ID starting with UC.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId, channelName: channelName || channelId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setChannels((prev) => [...prev, data]);
      setInput('');
      setChannelName('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(id) {
    await fetch(`/api/subscriptions/${id}`, { method: 'DELETE', credentials: 'include' });
    setChannels((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="page-inner">
      <h1 className="page-title">My Channels</h1>
      <p className="page-sub">New videos from these channels will be summarized and sent to your daily digest.</p>

      <form className="add-channel-form" onSubmit={handleAdd}>
        <div className="add-channel-inputs">
          <input
            className="url-input"
            type="text"
            placeholder="youtube.com/channel/UCxxxxxx or channel ID"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <input
            className="url-input channel-name-input"
            type="text"
            placeholder="Label (optional)"
            value={channelName}
            onChange={(e) => setChannelName(e.target.value)}
            disabled={loading}
          />
        </div>
        <button className="btn-summarize" type="submit" disabled={loading}>
          {loading ? 'Adding…' : 'Follow'}
        </button>
        {error && <div className="auth-error" style={{ marginTop: 8 }}>{error}</div>}
      </form>

      {channels.length === 0 ? (
        <p className="empty-state">No channels yet. Add one above to get started.</p>
      ) : (
        <ul className="channel-list">
          {channels.map((c) => (
            <li key={c.id} className="channel-item">
              <div>
                <div className="channel-name">{c.channel_name || c.channel_id}</div>
                <div className="channel-id">{c.channel_id}</div>
              </div>
              <button className="btn-remove" onClick={() => handleRemove(c.id)}>Remove</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
