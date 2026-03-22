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
        <div className="vrow-meta">
          {video.channelName && <span className="vrow-channel">{video.channelName}</span>}
          <span className="vrow-date">{date}</span>
          {video.readTimeSaved > 0 && <span className="vrow-saved">{video.readTimeSaved}m saved</span>}
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
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState(null);
  const [error, setError] = useState(false);

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

  async function handleScan() {
    setScanning(true);
    setScanMsg(null);
    try {
      const res = await fetch('/api/videos/scan', { method: 'POST', credentials: 'include' });
      const data = await res.json();
      setScanMsg(data.message || 'Scanning…');
      setTimeout(() => { setLoading(true); loadVideos(); }, 10000);
    } catch {
      setScanMsg('Scan failed. Please try again.');
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="page-inner">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">My Videos</h1>
          <p className="page-sub" style={{ margin: 0 }}>Click any video to read the summary.</p>
        </div>
        <button className="btn-scan" onClick={handleScan} disabled={scanning}>
          {scanning ? 'Scanning…' : 'Scan now'}
        </button>
      </div>
      {scanMsg && <p className="digest-next" style={{ marginTop: 10 }}>{scanMsg}</p>}

      {loading && <div style={{ padding: '48px 0', color: '#555', fontSize: 14, textAlign: 'center' }}>Loading…</div>}
      {error && <p className="auth-error">Couldn't load videos. Please refresh.</p>}

      {!loading && !error && videos.length === 0 && (
        <p className="empty-state">
          No videos yet. Summarize one on the{' '}
          <Link to="/" style={{ color: '#7c6fff' }}>Summarize page</Link>
          {' '}or <Link to="/channels" style={{ color: '#7c6fff' }}>follow channels</Link> and hit Scan now.
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
