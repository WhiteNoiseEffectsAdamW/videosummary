import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

function VideoRow({ video, onDelete }) {
  const navigate = useNavigate();
  const date = new Date(video.savedAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  function handleClick(e) {
    if (e.target.closest('.vrow-delete')) return;
    navigate(`/s/${video.videoId}`);
  }

  return (
    <div className="vrow" onClick={handleClick} role="button" tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/s/${video.videoId}`)}>
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
      <div className="vrow-main">
        <div className="vrow-title">{video.title || video.videoId}</div>
        {video.channelName && <div className="vrow-channel">{video.channelName}</div>}
        <div className="vrow-meta">
          <span className="vrow-date">{date}</span>
          {video.durationSeconds > 0 && <span className="vrow-duration">{Math.round(video.durationSeconds / 60) < 1 ? '< 1 min' : `${Math.round(video.durationSeconds / 60)} min`}</span>}
          {video.categories.slice(0, 2).map((c, i) => (
            <span key={i} className="pill pill-cat" style={{ fontSize: 11, padding: '2px 7px' }}>{c}</span>
          ))}
        </div>
      </div>
      <div className="vrow-right">
        <button className="vrow-delete" title="Remove" onClick={(e) => { e.stopPropagation(); onDelete(video.videoId); }}>×</button>
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
  const [sortOrder, setSortOrder] = useState('newest');

  function loadVideos() {
    setError(false);
    return fetch('/api/videos', { credentials: 'include' })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then(setVideos)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadVideos(); }, []);

  async function handleDelete(videoId) {
    setVideos((prev) => prev.filter((v) => v.videoId !== videoId));
    await fetch(`/api/videos/${videoId}`, { method: 'DELETE', credentials: 'include' });
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

  return (
    <div className="page-inner">
      {emailToast && (
        <div className={`toast${emailToast.ok ? '' : ' toast-error'}`}>{emailToast.msg}</div>
      )}
      <div className="videos-header">
        <h1 className="page-title" style={{ margin: 0 }}>My Videos</h1>
        {videos.length > 0 && (
          <button className="btn-test-email" onClick={handleSendTestEmail} disabled={sendingEmail}>
            {sendingEmail ? 'Sending…' : 'Send digest email'}
          </button>
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
        return (
          <>
            <div className="filter-bar">
              <input
                className="url-input videos-search"
                type="text"
                placeholder="Search by title or channel…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
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
                <select className="filter-select" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                </select>
              </div>
            </div>
            {filtered.length === 0 ? (
              <p className="empty-state" style={{ marginTop: 24 }}>No videos match this filter.</p>
            ) : (
              <div className="vlist">
                {filtered.map((v) => <VideoRow key={v.videoId} video={v} onDelete={handleDelete} />)}
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}
