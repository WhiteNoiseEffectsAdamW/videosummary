import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../AuthContext.jsx';
import PopularChannelSelect from '../components/PopularChannelSelect.jsx';

function formatRelative(dateStr) {
  const days = Math.floor((Date.now() - new Date(dateStr)) / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`;
  return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? 's' : ''} ago`;
}

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
      const normalized = !raw.startsWith('@') && !raw.startsWith('http') ? `@${raw}` : raw;
      const resolveUrl = normalized.startsWith('@') ? `https://www.youtube.com/${normalized}` : normalized;
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

  async function handleToggleShorts(id, current) {
    const next = !current;
    setChannels((prev) => prev.map((c) => c.id === id ? { ...c, include_shorts: next } : c));
    const res = await fetch(`/api/subscriptions/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ include_shorts: next }),
    });
    if (!res.ok) {
      setChannels((prev) => prev.map((c) => c.id === id ? { ...c, include_shorts: current } : c));
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

  const [openMenu, setOpenMenu] = useState(null);
  const [channelStatus, setChannelStatus] = useState({});
  const menuRefs = useRef({});
  const dragId = useRef(null);
  const dragOverId = useRef(null);

  function handleDragStart(e, id) {
    dragId.current = id;
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e, id) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    dragOverId.current = id;
    if (dragId.current === id) return;
    setChannels((prev) => {
      const from = prev.findIndex((c) => c.id === dragId.current);
      const to = prev.findIndex((c) => c.id === id);
      if (from === -1 || to === -1) return prev;
      const next = [...prev];
      next.splice(to, 0, next.splice(from, 1)[0]);
      return next;
    });
  }

  function handleDrop(e, id) {
    e.preventDefault();
    // Persist order to server
    setChannels((current) => {
      const orderedIds = current.map((c) => c.id);
      fetch('/api/subscriptions/reorder', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds }),
      }).catch(() => showToast('Could not save channel order.'));
      return current;
    });
    dragId.current = null;
    dragOverId.current = null;
  }

  useEffect(() => {
    function handleClickOutside(e) {
      if (openMenu && menuRefs.current[openMenu] && !menuRefs.current[openMenu].contains(e.target)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenu]);

  async function handleScanChannel(channelId) {
    setOpenMenu(null);
    setChannelStatus((prev) => ({ ...prev, [channelId]: 'scanning' }));
    try {
      await fetch('/api/videos/scan', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId }),
      });
      setChannelStatus((prev) => ({ ...prev, [channelId]: 'done' }));
      setTimeout(() => setChannelStatus((prev) => { const n = { ...prev }; delete n[channelId]; return n; }), 5000);
    } catch {
      setChannelStatus((prev) => { const n = { ...prev }; delete n[channelId]; return n; });
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
            placeholder="@handle or youtube.com/..."
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
            const shortsOn = c.include_shorts === true;
            const status = channelStatus[c.channel_id];
            return (
              <li key={c.id} className="channel-item"
                draggable
                onDragStart={(e) => handleDragStart(e, c.id)}
                onDragOver={(e) => handleDragOver(e, c.id)}
                onDrop={(e) => handleDrop(e, c.id)}
              >
                <div className="channel-drag-handle" title="Drag to reorder">⠿</div>
                <div>
                  <div className="channel-name">{(c.channel_name || c.channel_id).replace(/^@/, '')}</div>
                  {status === 'scanning' && <div className="channel-scan-status">Checking for new videos…</div>}
                  {status === 'done' && <div className="channel-scan-status">Done — check My Videos shortly.</div>}
                  {!status && c.lastPosted && (
                    <div className="channel-last-posted">Last posted {formatRelative(c.lastPosted)}</div>
                  )}
                </div>
                <div className="channel-item-actions">
                  <button
                    className={`btn-digest-pill${digestOn ? ' pill-on' : ' pill-off'}`}
                    onClick={() => handleToggleChannel(c.id, digestOn)}
                  >
                    {digestOn ? 'Active' : 'Paused'}
                  </button>
                  <div className="channel-menu-wrap" ref={(el) => { menuRefs.current[c.id] = el; }}>
                    <button
                      className="channel-menu-btn"
                      onClick={() => setOpenMenu(openMenu === c.id ? null : c.id)}
                      disabled={status === 'scanning'}
                      title="Channel settings"
                    >
                      {status === 'scanning' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="spin">
                          <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" />
                        </svg>
                      ) : '⋯'}
                    </button>
                    {openMenu === c.id && (
                      <div className="channel-menu">
                        <button className="channel-menu-item" onClick={() => handleScanChannel(c.channel_id)}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" />
                          </svg>
                          Refresh
                        </button>
                        <button className="channel-menu-item channel-menu-shorts" onClick={() => handleToggleShorts(c.id, shortsOn)}>
                          <span className={`channel-menu-check${shortsOn ? ' checked' : ''}`} />
                          Include Shorts
                        </button>
                        <div className="channel-menu-divider" />
                        <button className="channel-menu-item channel-menu-danger" onClick={() => { setOpenMenu(null); handleRemove(c.id, c.channel_name || c.channel_id); }}>
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
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
