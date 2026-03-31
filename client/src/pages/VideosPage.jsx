import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const VIEWED_KEY = 'hw_viewed_videos';

function getViewed() {
  try { return new Set(JSON.parse(localStorage.getItem(VIEWED_KEY) || '[]')); } catch { return new Set(); }
}
function markViewed(videoId) {
  const s = getViewed(); s.add(videoId);
  localStorage.setItem(VIEWED_KEY, JSON.stringify([...s]));
}

function VideoRow({ video, onDelete, selected, onToggle, anySelected, viewed }) {
  const navigate = useNavigate();
  const date = new Date(video.savedAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const longPressTimer = React.useRef(null);
  const [pulsing, setPulsing] = React.useState(false);

  function handleClick(e) {
    if (e.target.closest('.vrow-checkbox-wrap')) return;
    if (anySelected) { onToggle(video.videoId); return; }
    markViewed(video.videoId);
    navigate(`/s/${video.videoId}`);
  }

  function handleTouchStart() {
    longPressTimer.current = setTimeout(() => {
      setPulsing(true);
      setTimeout(() => setPulsing(false), 400);
      onToggle(video.videoId);
    }, 400);
  }

  function handleTouchEnd() {
    clearTimeout(longPressTimer.current);
  }

  return (
    <div
      className={`vrow${selected ? ' vrow-selected' : ''}${viewed && !selected ? ' vrow-viewed' : ''}${pulsing ? ' vrow-pulse' : ''}`}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchEnd}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick(e)}
    >
      <div className="vrow-main">
        <div className={`vrow-title${viewed && !selected ? ' vrow-title-viewed' : ''}`}>{video.title || video.videoId}</div>
        {video.channelName && <div className="vrow-channel">{video.channelName}</div>}
        <div className="vrow-meta">
          <span className="vrow-date">{date}</span>
          {video.durationSeconds > 0 && <span className="vrow-duration">{Math.round(video.durationSeconds / 60) < 1 ? '< 1 min' : `${Math.round(video.durationSeconds / 60)} min`}</span>}
          {(video.categories || []).slice(0, 2).map((c, i) => (
            <span key={i} className="pill pill-cat" style={{ fontSize: 11, padding: '2px 7px' }}>{c}</span>
          ))}
        </div>
      </div>
      {video.thumbnailUrl && (
        <div className="vrow-thumb-wrap">
          <img className="vrow-thumb" src={video.thumbnailUrl} alt=""
            onLoad={(e) => {
              if (e.target.src.includes('maxresdefault') && e.target.naturalWidth <= 120) {
                e.target.src = e.target.src.replace('maxresdefault', 'hqdefault');
              }
            }}
            onError={(e) => {
              if (e.target.src.includes('maxresdefault')) {
                e.target.src = e.target.src.replace('maxresdefault', 'hqdefault');
              } else {
                e.target.closest('.vrow-thumb-wrap').style.display = 'none';
              }
            }} />
        </div>
      )}
      {/* Checkbox on right — replaces × button */}
      <div className={`vrow-checkbox-wrap${anySelected ? ' vrow-checkbox-visible' : ''}`}>
        <input
          type="checkbox"
          className="vrow-checkbox"
          checked={selected}
          onChange={() => onToggle(video.videoId)}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
}


function ConfirmDialog({ count, onConfirm, onCancel }) {
  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <p className="confirm-msg">Delete {count} video{count !== 1 ? 's' : ''}? This can't be undone.</p>
        <div className="confirm-actions">
          <button className="confirm-cancel" onClick={onCancel}>Cancel</button>
          <button className="confirm-delete" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

export default function VideosPage() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailToast, setEmailToast] = useState(null);
  const [filterCategory, setFilterCategory] = useState(null);
  const [filterChannel, setFilterChannel] = useState(null);
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState(() => localStorage.getItem('hw_sort_order') || 'newest');
  const [selected, setSelected] = useState(new Set());
  const [confirmIds, setConfirmIds] = useState(null); // null | string[]
  const [viewed, setViewed] = useState(() => getViewed());

  function loadVideos() {
    setError(false);
    return fetch('/api/videos', { credentials: 'include' })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then(setVideos)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadVideos(); }, []);

  // Sync viewed state from localStorage on focus (in case another tab updated it)
  useEffect(() => {
    const sync = () => setViewed(getViewed());
    window.addEventListener('focus', sync);
    return () => window.removeEventListener('focus', sync);
  }, []);

  function toggleSelect(videoId) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(videoId) ? next.delete(videoId) : next.add(videoId);
      return next;
    });
  }

  function clearSelection() { setSelected(new Set()); }

  // Called with array of videoIds — single delete skips confirm, bulk shows dialog
  function requestDelete(ids) {
    if (ids.length === 1) {
      doDelete(ids);
    } else {
      setConfirmIds(ids);
    }
  }

  async function doDelete(ids) {
    setConfirmIds(null);
    setSelected(new Set());
    setVideos((prev) => prev.filter((v) => !ids.includes(v.videoId)));
    await Promise.all(ids.map((id) => fetch(`/api/videos/${id}`, { method: 'DELETE', credentials: 'include' })));
  }

  async function handleSendTestEmail() {
    setSendingEmail(true);
    setEmailToast(null);
    try {
      const res = await fetch('/api/videos/send-test-digest', { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEmailToast({ ok: true, msg: 'Email sent — check your inbox.' });
    } catch (err) {
      setEmailToast({ ok: false, msg: err.message || 'Could not send email.' });
    } finally {
      setSendingEmail(false);
      setTimeout(() => setEmailToast(null), 4000);
    }
  }

  const anySelected = selected.size > 0;

  return (
    <div className="page-inner">
      {emailToast && (
        <div className={`toast${emailToast.ok ? '' : ' toast-error'}`}>{emailToast.msg}</div>
      )}
      {confirmIds && (
        <ConfirmDialog
          count={confirmIds.length}
          onConfirm={() => doDelete(confirmIds)}
          onCancel={() => setConfirmIds(null)}
        />
      )}

      <div className="videos-header">
        <h1 className="page-title" style={{ margin: 0 }}>My Videos</h1>
        {anySelected && (
          <div className="bulk-bar">
            <span className="bulk-bar-count">{selected.size} selected</span>
            <button className="bulk-bar-clear" onClick={clearSelection}>Deselect all</button>
            <button className="bulk-bar-delete" onClick={() => requestDelete([...selected])}>Delete ({selected.size})</button>
          </div>
        )}
      </div>

      {loading && <div style={{ padding: '48px 0', color: '#555', fontSize: 14, textAlign: 'center' }}>Loading…</div>}
      {error && <p className="auth-error">Couldn't load videos. Please refresh.</p>}

      {!loading && !error && videos.length === 0 && (
        <div className="empty-state-block">
          <p className="empty-state-title">No videos yet.</p>
          <p className="empty-state-sub">Videos appear here when you summarize one manually or when a channel you follow posts something new.</p>
          <div className="empty-state-actions">
            <Link to="/" className="btn-primary empty-cta">Summarize a video</Link>
            <Link to="/following" className="empty-cta-secondary">Follow channels →</Link>
          </div>
        </div>
      )}

      {videos.length > 0 && (() => {
        const allCategories = [...new Set(videos.flatMap((v) => v.categories || []))].sort();
        const allChannels = [...new Set(videos.map((v) => v.channelName).filter(Boolean))].sort();
        const q = search.trim().toLowerCase();
        const filtered = videos
          .filter((v) => {
            if (filterCategory && !(v.categories || []).includes(filterCategory)) return false;
            if (filterChannel && v.channelName !== filterChannel) return false;
            if (q && !`${v.title || ''} ${v.channelName || ''}`.toLowerCase().includes(q)) return false;
            return true;
          })
          .sort((a, b) => {
            const da = new Date(a.savedAt), db = new Date(b.savedAt);
            return sortOrder === 'oldest' ? da - db : db - da;
          });

        const isFiltered = q || filterCategory || filterChannel;

        return (
          <>
            {/* Search — full width above filter row */}
            <input
              className="url-input videos-search-full"
              type="text"
              placeholder="Search by title or channel…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {/* Filter row */}
            <div className="filter-bar">
              <div className="filter-dropdowns">
                {allChannels.length > 0 && (
                  <select className="filter-select" value={filterChannel || ''} onChange={(e) => setFilterChannel(e.target.value || null)}>
                    <option value="">All channels</option>
                    {allChannels.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                )}
                {allCategories.length > 0 && (
                  <select className="filter-select" value={filterCategory || ''} onChange={(e) => setFilterCategory(e.target.value || null)}>
                    <option value="">All categories</option>
                    {allCategories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                )}
                <select className="filter-select" value={sortOrder} onChange={(e) => { setSortOrder(e.target.value); localStorage.setItem('hw_sort_order', e.target.value); }}>
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                </select>
              </div>
              {isFiltered && (
                <span className="filter-result-count">{filtered.length} of {videos.length}</span>
              )}
            </div>


            {filtered.length === 0 ? (
              <p className="empty-state" style={{ marginTop: 24 }}>No videos match this filter.</p>
            ) : (
              <div className="vlist">
                {filtered.map((v) => (
                  <VideoRow
                    key={v.videoId}
                    video={v}
                    onDelete={requestDelete}
                    selected={selected.has(v.videoId)}
                    onToggle={toggleSelect}
                    anySelected={anySelected}
                    viewed={viewed.has(v.videoId)}
                  />
                ))}
              </div>
            )}
          </>
        );
      })()}

      {videos.length > 0 && (
        <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
          <button className="btn-test-email" onClick={handleSendTestEmail} disabled={sendingEmail}>
            {sendingEmail ? 'Sending…' : 'Send digest email'}
          </button>
        </div>
      )}
    </div>
  );
}
