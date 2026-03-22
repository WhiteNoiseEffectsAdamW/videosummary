import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const DEMO_VIDEO_ID = 'UclrVWafRAI';
const VERDICT_COLOR = { Watch: '#22c55e', Skip: '#f59e0b', 'Watch segment': '#7c6fff' };

function CuratedSummary({ data, isDemo }) {
  const { titleClaim, tldr, verdict, quotes = [], channelName, title, videoId, thumbnailUrl } = data;
  const quote = quotes[0];

  return (
    <div className="landing-demo-card">
      {isDemo && <div className="landing-demo-badge">Example</div>}

      <a href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noopener noreferrer" className="landing-thumb-link">
        <img src={thumbnailUrl} alt={title || ''} className="landing-thumb"
          onError={(e) => { e.target.closest('.landing-thumb-link').style.display = 'none'; }} />
      </a>

      {(channelName || title) && (
        <div className="landing-video-ref">
          {channelName && <span className="landing-video-channel">{channelName}</span>}
          {title && <span className="landing-video-title">{title}</span>}
        </div>
      )}

      {titleClaim?.claim && titleClaim?.reality && (
        <div className="card card-title-claim" style={{ marginTop: 20 }}>
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

      {tldr && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="card-label">TL;DR</div>
          <p className="tldr-text">{tldr}</p>
        </div>
      )}

      {verdict && (
        <div className="landing-verdict">
          <span className="landing-verdict-action" style={{ color: VERDICT_COLOR[verdict.action] || '#aaa' }}>
            {verdict.action === 'Watch segment' ? `Watch ${verdict.segment}` : verdict.action}
          </span>
          <span className="landing-verdict-reason">{verdict.reason}</span>
        </div>
      )}

      {quote && <div className="landing-quote">"{quote.text}"</div>}
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [demoData, setDemoData] = useState(null);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [limitReached, setLimitReached] = useState(false);

  useEffect(() => {
    fetch(`/api/summary/${DEMO_VIDEO_ID}`)
      .then((r) => r.json())
      .then((json) => { if (!json.error) setDemoData(json); })
      .catch(() => {});
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!url.trim()) return;
    if (!url.match(/(?:youtube\.com|youtu\.be)/)) {
      setError('Please enter a valid YouTube URL.');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setLimitReached(false);
    try {
      const res = await fetch(`/api/summary?url=${encodeURIComponent(url.trim())}`);
      const json = await res.json();
      if (json.limitReached) { setLimitReached(true); return; }
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setResult(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="landing-page">

      <header className="landing-nav">
        <span className="landing-brand">Headwater</span>
        <div className="landing-nav-right">
          <Link to="/login" className="landing-nav-link">Sign in</Link>
          <Link to="/register" className="btn-primary">Try it free</Link>
        </div>
      </header>

      <div className="landing-hero">
        <h1 className="landing-headline">Know if a video is worth<br />your time.</h1>
        <p className="landing-sub">Paste any YouTube link and get a verdict, key topics, and notable quotes — or follow channels for a daily digest in your inbox.</p>

        <form className="landing-input-row" onSubmit={handleSubmit}>
          <input
            className="url-input landing-url-input"
            type="text"
            placeholder="https://www.youtube.com/watch?v=..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={loading}
          />
          <button className="btn-primary landing-submit-btn" type="submit" disabled={loading}>
            {loading ? 'Summarizing…' : 'Summarize'}
          </button>
        </form>

        {error && <div className="landing-input-error">{error}</div>}

        {limitReached && (
          <div className="landing-limit-box">
            You've used your 3 free summaries.{' '}
            <Link to="/register" style={{ color: '#7c6fff' }}>Sign up free</Link> to keep going.
          </div>
        )}
      </div>

      {/* Result or demo */}
      <div className="landing-demo">
        {loading && (
          <div className="loader" style={{ paddingTop: 32, paddingBottom: 32 }}>
            <div className="spinner" />
            <span>Fetching transcript and generating summary…</span>
          </div>
        )}

        {result && !loading && (
          <>
            <CuratedSummary data={result} isDemo={false} />
            <div className="landing-inline-cta">
              <Link to="/register" className="btn-primary">Sign up to save this and follow channels →</Link>
              <span className="landing-inline-cta-sub">Free. No credit card required.</span>
            </div>
          </>
        )}

        {!result && !loading && demoData && (
          <>
            <div className="landing-demo-label">Or see an example</div>
            <CuratedSummary data={demoData} isDemo={true} />
            <div className="landing-inline-cta">
              <Link to="/register" className="btn-primary">Try it free →</Link>
              <span className="landing-inline-cta-sub">Free. No credit card required.</span>
            </div>
          </>
        )}
      </div>

      <footer className="landing-footer">
        <span>© {new Date().getFullYear()} Headwater</span>
        <Link to="/login" className="landing-footer-link">Sign in</Link>
      </footer>

    </div>
  );
}
