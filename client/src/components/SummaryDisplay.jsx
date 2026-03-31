import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

const FIRST_SUMMARY_KEY = 'hw_first_summary_seen';

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


function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return null;
  const mins = Math.round(seconds / 60);
  return mins < 1 ? '< 1 min' : `${mins} min`;
}

export default function SummaryDisplay({ data }) {
  if (!data) return null;
  const { tldr, topics = [], quotes = [], categories = [], cached, videoId, thumbnailUrl, title, titleClaim, channelName, channelId, durationSeconds } = data;
  const savesMins = durationSeconds > 0 ? Math.round(durationSeconds / 60) : null;
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState(null);
  const [followState, setFollowState] = useState('idle'); // idle | loading | following | error
  const followSectionRef = useRef(null);
  const isFirstSummary = !localStorage.getItem(FIRST_SUMMARY_KEY);

  // Check if already following this channel on mount
  useEffect(() => {
    if (!user || !channelId) return;
    fetch(`/api/subscriptions/check?channelId=${encodeURIComponent(channelId)}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => { if (d.following) setFollowState('following'); })
      .catch(() => {});
  }, [user, channelId]);

  // First-time visit: mark seen and auto-scroll to follow section after delay
  useEffect(() => {
    if (!isFirstSummary || followState === 'following') return;
    localStorage.setItem(FIRST_SUMMARY_KEY, '1');
    const timer = setTimeout(() => {
      followSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

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

  async function handleShare() {
    const url = `${window.location.origin}/s/${videoId}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: title || 'Video summary', url });
      } catch {}
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setToast('Copied!');
        setTimeout(() => setToast(null), 2500);
      });
    }
  }

  return (
    <div>
      {/* Header: badge + title + thumbnail inset */}
      <div className="summary-header-row">
        <div className="summary-header-left">
          <div className="summary-badge">Headwater Summary</div>
          {title && <div className="summary-title">{title}</div>}
          {channelName && (
            <div className="summary-channel-line">
              <span className="summary-channel">{channelName}{formatDuration(durationSeconds) ? <span className="summary-duration"> · {formatDuration(durationSeconds)}</span> : null}</span>
            </div>
          )}
        </div>
        {thumbnailUrl && (
          <a
            className="summary-thumb-inset"
            href={`https://www.youtube.com/watch?v=${videoId}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src={thumbnailUrl}
              alt="Video thumbnail"
              onLoad={(e) => {
                if (e.target.src.includes('maxresdefault') && e.target.naturalWidth <= 120) {
                  e.target.src = e.target.src.replace('maxresdefault', 'hqdefault');
                }
              }}
              onError={(e) => {
                if (e.target.src.includes('maxresdefault')) {
                  e.target.src = e.target.src.replace('maxresdefault', 'hqdefault');
                } else {
                  e.target.closest('.summary-thumb-inset').style.display = 'none';
                }
              }}
            />
          </a>
        )}
      </div>

      {/* Action row */}
      <div className="summary-action-row">
        {channelName && (user ? (
          <button
            className={`btn-follow${followState === 'following' ? ' btn-follow-done' : ''}`}
            onClick={handleFollow}
            disabled={followState !== 'idle'}
          >
            {followState === 'loading' ? 'Following…' : followState === 'following' ? '✓ Following' : followState === 'error' ? 'Error' : 'Follow'}
          </button>
        ) : (
          <Link to="/register" className="btn-follow">Follow</Link>
        ))}
        <a className="btn-watch-yt" href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noopener noreferrer">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" stroke="none"/>
          </svg>
          Watch
        </a>
        <button className="btn-share-subtle" onClick={handleShare} title="Share">
          {toast ? <span style={{ fontSize: 12, fontWeight: 500 }}>Copied!</span> : (
            <>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                <polyline points="16 6 12 2 8 6"/>
                <line x1="12" y1="2" x2="12" y2="15"/>
              </svg>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Share</span>
            </>
          )}
        </button>
      </div>

      {/* TL;DR — above fold, before categories */}
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

      {/* Follow section — shown when channel is known and user hasn't followed yet */}
      {channelName && followState !== 'following' && (
        <div className="follow-section" ref={followSectionRef}>
          <div className="follow-section-text">
            <div className="follow-section-headline">
              Get {channelName} in your morning digest.
            </div>
            <div className="follow-section-sub">
              New videos, summarized overnight, in your inbox before 8am.
            </div>
          </div>
          {user ? (
            <button
              className="follow-section-btn"
              onClick={handleFollow}
              disabled={followState === 'loading'}
            >
              {followState === 'loading' ? 'Adding…' : followState === 'error' ? 'Try again' : 'Add to my digest'}
            </button>
          ) : (
            <Link to="/register" className="follow-section-btn">Add to my digest</Link>
          )}
          <div className="follow-section-reassure">Free · One email per morning · Unsubscribe anytime</div>
        </div>
      )}

      {channelName && followState === 'following' && (
        <div className="follow-section follow-section-done">
          <div className="follow-section-headline">✓ You follow {channelName}</div>
          <div className="follow-section-sub">New videos will appear in your morning digest.</div>
        </div>
      )}

      {/* Disclaimer */}
      <p className="summary-disclaimer">
        Summary is AI-generated and may be incomplete or inaccurate. Watch the full video for complete context.{' '}
        <a href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noopener noreferrer">Watch on YouTube →</a>
      </p>

    </div>
  );
}
