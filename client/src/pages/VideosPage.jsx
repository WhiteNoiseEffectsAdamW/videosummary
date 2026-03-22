import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const VERDICT_LABEL = { Watch: '▶ Watch', Skip: '✕ Skip', 'Watch segment': '◎ Segment' };
const VERDICT_CLS = { Watch: 'vbadge-watch', Skip: 'vbadge-skip', 'Watch segment': 'vbadge-segment' };

function VideoRow({ video, onDelete }) {
  const navigate = useNavigate();
  const date = new Date(video.savedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const verdictLabel = video.verdict ? (VERDICT_LABEL[video.verdict.action] || video.verdict.action) : null;
  const verdictCls = video.verdict ? (VERDICT_CLS[video.verdict.action] || '') : '';

  function handleClick(e) {
    if (e.target.closest('.vrow-delete')) return;
    navigate(`/?v=${video.videoId}`);
  }

  return (
    <div className="vrow" onClick={handleClick} role="button" tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/?v=${video.videoId}`)}>
      <div className="vrow-main">
        <div className="vrow-title">{video.title || video.videoId}</div>
        {video.channelName && <div className="vrow-channel">{video.channelName}</div>}
        <div className="vrow-meta">
          <span className="vrow-date">{date}</span>
          {video.categories.slice(0, 2).map((c, i) => (
            <span key={i} className="pill pill-cat" style={{ fontSize: 11, padding: '2px 7px' }}>{c}</span>
          ))}
        </div>
      </div>
      <div className="vrow-right">
        {verdictLabel && <span className={`vbadge ${verdictCls}`}>{verdictLabel}</span>}
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
        <p className="empty-state">
          No videos yet. Summarize one on the{' '}
          <Link to="/" style={{ color: '#7c6fff' }}>Summarize page</Link>
          {' '}or <Link to="/following" style={{ color: '#7c6fff' }}>follow channels</Link>.
        </p>
      )}

      {videos.length > 0 && (
        <div className="vlist">
          {videos.map((v) => <VideoRow key={v.videoId} video={v} onDelete={handleDelete} />)}
        </div>
      )}
    </div>
  );
}
