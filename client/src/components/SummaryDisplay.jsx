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


function esc(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildEmbedHtml({ title, channelName, durationSeconds, videoId, slug, thumbnailUrl, tldr, topics = [], quotes = [], titleVsDelivered, inContext }) {
  const summaryUrl = `${window.location.origin}/s/${slug || videoId}`;
  const dur = durationSeconds > 0 ? `${Math.round(durationSeconds / 60)} min` : '';
  const meta = [channelName, dur].filter(Boolean).join(' · ');

  const ytBase = `https://www.youtube.com/watch?v=${videoId}`;
  const tsUrl = (ts) => ts ? `${ytBase}&t=${tsToSeconds(ts)}` : ytBase;

  const topicsHtml = topics.map((t) =>
    `<div style="padding:6px 0;font-size:14px;line-height:1.5;"><strong style="color:#1a1a1a;">${esc(t.title)}</strong>${t.description ? ` <span style="color:#666;">— ${esc(t.description)}</span>` : ''}${t.timestamp ? ` <a href="${tsUrl(t.timestamp)}" style="color:#b8924a;font-size:13px;text-decoration:none;" target="_blank">${esc(t.timestamp)}</a>` : ''}</div>`
  ).join('');

  const quotesHtml = quotes.map((q) =>
    `<div style="border-left:2px solid #b8924a;padding-left:14px;margin-bottom:12px;">${q.setup ? `<div style="font-size:12px;font-style:italic;color:#888;margin-bottom:2px;">${esc(q.setup)}</div>` : ''}<em style="color:#444;font-size:14px;line-height:1.6;">"${esc(q.text)}"</em>${q.timestamp ? ` <a href="${tsUrl(q.timestamp)}" style="color:#b8924a;font-size:12px;text-decoration:none;" target="_blank">— ${esc(q.timestamp)}</a>` : ''}</div>`
  ).join('');

  const flagsHtml = [
    titleVsDelivered ? `<div style="border-left:2px solid #c49a2a;padding-left:12px;margin-bottom:14px;"><strong style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#c49a2a;">Title vs Delivered</strong><div style="font-size:13px;color:#555;margin-top:4px;">${esc(titleVsDelivered)}</div></div>` : '',
    inContext ? `<div style="border-left:2px solid #c49a2a;padding-left:12px;margin-bottom:14px;"><strong style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#c49a2a;">In Context</strong><div style="font-size:13px;color:#555;margin-top:4px;">${esc(inContext)}</div></div>` : '',
  ].join('');

  return `<div style="max-width:620px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;background:#fafaf7;border:1px solid #e8e4dc;border-radius:8px;padding:24px;line-height:1.6;color:#333;">
${thumbnailUrl ? `<a href="${summaryUrl}" style="display:block;margin-bottom:16px;line-height:0;"><img src="${esc(thumbnailUrl)}" alt="" style="width:100%;max-width:580px;height:auto;border-radius:6px;display:block;" /></a>` : ''}
${meta ? `<div style="font-size:12px;font-weight:600;color:#b8924a;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">${esc(meta)}</div>` : ''}
<div style="display:flex;align-items:baseline;gap:12px;margin-bottom:12px;flex-wrap:wrap;">
<div style="font-size:20px;font-weight:700;color:#1a1a1a;line-height:1.3;"><a href="${summaryUrl}" style="color:#1a1a1a;text-decoration:none;">${esc(title || videoId)}</a></div>
<a href="${ytBase}" style="font-size:12px;font-weight:600;color:#b8924a;text-decoration:none;white-space:nowrap;flex-shrink:0;" target="_blank">▶ Watch on YouTube</a>
</div>
${quotes.length > 0 ? `<div style="border-left:3px solid #b8924a;padding-left:14px;margin-bottom:14px;">${quotes[0].setup ? `<div style="font-size:12px;font-style:italic;color:#888;margin-bottom:2px;">${esc(quotes[0].setup)}</div>` : ''}<em style="font-size:16px;color:#444;line-height:1.6;">"${esc(quotes[0].text)}"</em>${quotes[0].timestamp ? ` <a href="${tsUrl(quotes[0].timestamp)}" style="color:#b8924a;font-size:12px;text-decoration:none;" target="_blank">— ${esc(quotes[0].timestamp)}</a>` : ''}</div>` : ''}
${tldr ? `<p style="font-size:15px;color:#333;margin:0 0 16px;">${esc(tldr)}</p>` : ''}
${flagsHtml}
${topics.length > 0 ? `<div style="border-top:1px solid #e8e4dc;padding-top:14px;margin-bottom:14px;"><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#999;margin-bottom:10px;">Key Topics</div>${topicsHtml}</div>` : ''}
${quotes.length > 1 ? `<div style="border-top:1px solid #e8e4dc;padding-top:14px;margin-bottom:14px;"><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#999;margin-bottom:10px;">Notable Quotes</div>${quotesHtml}</div>` : ''}
<div style="border-top:1px solid #e8e4dc;padding-top:24px;text-align:left;">
<a href="https://headwaterapp.com" style="text-decoration:none;display:inline-block;margin-bottom:8px;">
<svg width="180" height="34" viewBox="0 0 180 34" xmlns="http://www.w3.org/2000/svg"><text x="0" y="27" style="font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:400;"><tspan fill="#1a1a1a">Head</tspan><tspan fill="#b8924a">water</tspan></text></svg>
</a>
<div style="font-size:13px;color:#999;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<a href="https://headwaterapp.com" style="color:#b8924a;text-decoration:none;">Get video summaries &rarr; headwaterapp.com</a>
</div>
</div>
</div>`;
}

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return null;
  const mins = Math.round(seconds / 60);
  return mins < 1 ? '< 1 min' : `${mins} min`;
}

export default function SummaryDisplay({ data }) {
  if (!data) return null;
  const { tldr, topics = [], quotes = [], categories = [], cached, videoId, slug, thumbnailUrl, title, titleVsDelivered, inContext, channelName, channelId, durationSeconds } = data;
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

  const [shareOpen, setShareOpen] = useState(false);
  const shareRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (shareRef.current && !shareRef.current.contains(e.target)) setShareOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleCopyLink() {
    const url = `${window.location.origin}/s/${slug || videoId}`;
    navigator.clipboard.writeText(url).then(() => {
      setToast('Link copied!');
      setShareOpen(false);
      setTimeout(() => setToast(null), 2500);
    });
  }

  function handleCopyHtml() {
    const html = buildEmbedHtml({ title, channelName, durationSeconds, videoId, slug, thumbnailUrl, tldr, topics, quotes, titleVsDelivered, inContext });
    navigator.clipboard.writeText(html).then(() => {
      setToast('HTML copied!');
      setShareOpen(false);
      setTimeout(() => setToast(null), 2500);
    });
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
        <div className="share-wrap" ref={shareRef}>
          <button className="btn-share-subtle" onClick={() => setShareOpen((o) => !o)} title="Share">
            {toast ? <span style={{ fontSize: 12, fontWeight: 500 }}>{toast}</span> : (
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
          {shareOpen && (
            <div className="share-menu">
              <button className="share-menu-item" onClick={handleCopyLink}>Copy link</button>
              <button className="share-menu-item" onClick={handleCopyHtml}>Copy HTML</button>
            </div>
          )}
        </div>
      </div>

      {/* TL;DR — above fold, before categories */}
      <div className="card">
        <div className="card-label">TL;DR</div>
        {quotes.length > 0 && (
          <div className="tldr-quote-wrap">
            {quotes[0].setup && <div className="quote-setup">{quotes[0].setup}</div>}
            <p className="tldr-quote">
              "{quotes[0].text}"
              {quotes[0].timestamp && (
                <> — <a className="tldr-quote-ts" href={ytUrl(videoId, quotes[0].timestamp)} target="_blank" rel="noopener noreferrer">{quotes[0].timestamp}</a></>
              )}
            </p>
          </div>
        )}
        <p className="tldr-text">{tldr}</p>
      </div>

      {/* Flags — only render when present */}
      {titleVsDelivered && (
        <div className="card card-flag card-flag-headsup">
          <div className="card-label">Title vs Delivered</div>
          <p className="flag-text">{titleVsDelivered}</p>
        </div>
      )}
      {inContext && (
        <div className="card card-flag card-flag-reality">
          <div className="card-label">In Context</div>
          <p className="flag-text">{inContext}</p>
        </div>
      )}

      {/* Topics */}
      {topics.length > 0 && (
        <div className="card">
          <div className="card-label">Key Topics</div>
          {topics.map((topic, i) => (
            <div key={i} className="topic-item">
              <div className="topic-title">
                {topic.title}
                {topic.description && <span className="topic-desc"> — {topic.description}</span>}
                {topic.timestamp && (
                  <a className="topic-ts" href={ytUrl(videoId, topic.timestamp)} target="_blank" rel="noopener noreferrer">
                    {topic.timestamp}
                  </a>
                )}
              </div>
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
              {q.setup && <div className="quote-setup">{q.setup}</div>}
              <div className="quote-text">
                "{q.text}"
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
