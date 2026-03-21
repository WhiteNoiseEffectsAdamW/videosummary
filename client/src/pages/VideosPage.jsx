import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

function VerdictBadge({ verdict }) {
  if (!verdict) return null;
  const cls = `verdict verdict-${verdict.action.toLowerCase().replace(' ', '-')}`;
  const label = verdict.action === 'Watch segment' ? `Watch ${verdict.segment}` : verdict.action;
  return (
    <div className={cls} style={{ marginBottom: 10 }}>
      <span className="verdict-action">{label}</span>
      <span className="verdict-reason">{verdict.reason}</span>
    </div>
  );
}

function VideoCard({ video }) {
  const date = new Date(video.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return (
    <div className="video-card">
      <a
        href={`https://www.youtube.com/watch?v=${video.videoId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="video-thumb-link"
      >
        <div className="video-thumb-wrap">
          <img
            className="video-thumb"
            src={video.thumbnailUrl}
            alt=""
            onError={(e) => { e.target.closest('.video-thumb-wrap').style.display = 'none'; }}
          />
        </div>
      </a>
      <div className="video-body">
        <div className="video-meta">
          <span className="video-channel">{video.channelName}</span>
          <span className="video-date">{date}</span>
          {video.readTimeSaved > 0 && (
            <span className="pill pill-time" style={{ marginLeft: 'auto' }}>~{video.readTimeSaved} min saved</span>
          )}
        </div>
        {video.categories.length > 0 && (
          <div className="categories-row" style={{ marginBottom: 8 }}>
            {video.categories.map((cat, i) => (
              <span key={i} className="pill pill-cat">{cat}</span>
            ))}
          </div>
        )}
        <VerdictBadge verdict={video.verdict} />
        {video.tldr && <p className="video-tldr">{video.tldr}</p>}
        <a
          href={`https://www.youtube.com/watch?v=${video.videoId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="video-watch-link"
        >
          Watch on YouTube →
        </a>
      </div>
    </div>
  );
}

export default function VideosPage() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/videos', { credentials: 'include' })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then(setVideos)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-inner">
      <h1 className="page-title">My Videos</h1>
      <p className="page-sub">Summaries from your followed channels, newest first.</p>

      {loading && <div className="loading-screen" style={{ height: 'auto', padding: '48px 0' }}>Loading…</div>}
      {error && <p className="auth-error">Couldn't load videos. Please refresh.</p>}

      {!loading && !error && videos.length === 0 && (
        <p className="empty-state">
          No summaries yet.{' '}
          <Link to="/channels" style={{ color: '#7c6fff' }}>Follow some channels</Link>
          {' '}and summaries will appear here as new videos are detected.
        </p>
      )}

      <div className="video-list">
        {videos.map((v) => <VideoCard key={v.videoId} video={v} />)}
      </div>
    </div>
  );
}
