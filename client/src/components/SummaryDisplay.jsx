import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

function CopyQuoteButton({ text, timestamp }) {
  const [copied, setCopied] = useState(false);
  const handle = useCallback(() => {
    const content = timestamp ? `"${text}" — ${timestamp}` : `"${text}"`;
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text, timestamp]);
  return (
    <button className="quote-copy-btn" onClick={handle} title="Copy quote">
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function tsToSeconds(ts) {
  if (!ts) return 0;
  const parts = ts.trim().split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0];
}

function ytUrl(videoId, ts, leadSeconds = 0) {
  const secs = Math.max(0, tsToSeconds(ts) - leadSeconds);
  return `https://www.youtube.com/watch?v=${videoId}&t=${secs}`;
}


export default function SummaryDisplay({ data }) {
  if (!data) return null;
  const { tldr, topics = [], quotes = [], categories = [], cached, videoId, thumbnailUrl, title, titleClaim, channelName } = data;
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [followState, setFollowState] = useState('idle'); // idle | loading | following | error

  async function handleFollow() {
    if (followState !== 'idle') return;
    setFollowState('loading');
    try {
      const resolveRes = await fetch(`/api/channels/resolve?videoId=${videoId}`, { credentials: 'include' });
      const resolved = await resolveRes.json();
      if (!resolveRes.ok) throw new Error(resolved.error);

      const subRes = await fetch('/api/subscriptions', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId: resolved.channelId, channelName: resolved.channelName || channelName }),
      });
      if (!subRes.ok) {
        const d = await subRes.json();
        if (subRes.status === 409) { setFollowState('following'); return; }
        throw new Error(d.error);
      }
      setFollowState('following');
    } catch {
      setFollowState('error');
      setTimeout(() => setFollowState('idle'), 3000);
    }
  }

  function handleShare() {
    const url = `${window.location.origin}/s/${videoId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div>
      {/* Thumbnail */}
      {thumbnailUrl && (
        <div className="thumbnail-wrap">
          <a href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noopener noreferrer">
            <img
              className="thumbnail"
              src={thumbnailUrl}
              alt="Video thumbnail"
              onError={(e) => {
                if (e.target.src.includes('maxresdefault')) {
                  e.target.src = e.target.src.replace('maxresdefault', 'hqdefault');
                } else {
                  e.target.closest('.thumbnail-wrap').style.display = 'none';
                }
              }}
            />
          </a>
        </div>
      )}

      {/* Channel + Watch CTA + Share */}
      <div className="summary-header">
        <div className="summary-channel-group">
          {channelName && <span className="summary-channel">{channelName}</span>}
          {channelName && (
            <div className="btn-follow-wrap">
              {user ? (
                <button
                  className={`btn-follow${followState === 'following' ? ' btn-follow-done' : ''}`}
                  onClick={handleFollow}
                  disabled={followState !== 'idle'}
                >
                  {followState === 'loading' ? 'Following…' : followState === 'following' ? '✓ Following' : followState === 'error' ? 'Error' : 'Follow this channel'}
                </button>
              ) : (
                <Link to="/register" className="btn-follow">Follow this channel</Link>
              )}
              {followState === 'idle' && <span className="btn-follow-sub">Get new video summaries by email</span>}
            </div>
          )}
        </div>
        <div className="summary-header-actions">
          <a
            className="btn-watch-yt"
            href={`https://www.youtube.com/watch?v=${videoId}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" stroke="none"/>
            </svg>
            Watch on YouTube
          </a>
        </div>
      </div>

      {/* Title */}
      {title && <div className="summary-title">{title}</div>}


      {/* Categories */}
      {categories.length > 0 && (
        <div className="categories-row">
          {categories.map((cat, i) => (
            <span key={i} className="pill pill-cat">{cat}</span>
          ))}
        </div>
      )}

      {/* TL;DR */}
      <div className="card">
        <div className="card-label">TL;DR</div>
        {quotes.length > 0 && (
          <p className="tldr-quote">"{quotes[0].text}"</p>
        )}
        <p className="tldr-text">{tldr}</p>
      </div>

      {/* Title Claim */}
      {titleClaim?.claim && titleClaim?.reality && (
        <div className="card card-title-claim">
          <div className="card-label">Title vs Reality</div>
          <div className="title-claim-row">
            <span className="title-claim-label">Promised</span>
            <span className="title-claim-text">{titleClaim.claim}</span>
          </div>
          <div className="title-claim-row">
            <span className="title-claim-label">Delivered</span>
            <span className="title-claim-text">{titleClaim.reality}</span>
          </div>
        </div>
      )}

      {/* Topics */}
      {topics.length > 0 && (
        <div className="card">
          <div className="card-label">Key Topics</div>
          {topics.map((topic, i) => (
            <div key={i} className="topic-item">
              <div className="topic-title">{topic.title}</div>
              <div className="topic-desc">{topic.description}</div>
              {topic.timestamp && (
                <a className="topic-ts" href={ytUrl(videoId, topic.timestamp)} target="_blank" rel="noopener noreferrer">
                  {topic.timestamp}
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Quotes */}
      {quotes.length > 0 && (
        <div className="card">
          <div className="card-label">Notable Quotes</div>
          {quotes.map((q, i) => (
            <div key={i} className="quote-item">
              <div className="quote-text">"{q.text}"</div>
              <div className="quote-meta">
                {q.context}
                {q.timestamp && (
                  <a className="quote-ts" href={ytUrl(videoId, q.timestamp)} target="_blank" rel="noopener noreferrer"> — {q.timestamp}</a>
                )}
              </div>
              <CopyQuoteButton text={q.text} timestamp={q.timestamp} />
            </div>
          ))}
        </div>
      )}

      {/* Disclaimer */}
      <p className="summary-disclaimer">
        Summary is AI-generated and may be incomplete or inaccurate. Watch the full video for complete context.{' '}
        <a href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noopener noreferrer">Watch on YouTube →</a>
      </p>

      {/* Share — after content, when user has decided it's worth sharing */}
      <div className="summary-share-row">
        <button className="btn-share" onClick={handleShare}>
          {copied ? 'Copied!' : 'Send to a friend'}
        </button>
      </div>
    </div>
  );
}
