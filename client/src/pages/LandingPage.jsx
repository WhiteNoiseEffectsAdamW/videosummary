import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const DEMO_VIDEO_ID = 'UclrVWafRAI';
const VERDICT_COLOR = { Watch: '#22d3ee', Skip: '#334155', 'Watch segment': '#8aa4c8' };

function useFadeIn() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('fade-in-visible'); observer.disconnect(); } },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

function DigestSection({ data }) {
  const ref = useFadeIn();
  // Grab first ~110 chars, trim to last word boundary — avoids abbreviation splits like "Dr."
  const tldrFirst = data?.tldr
    ? data.tldr.length <= 110
      ? data.tldr
      : data.tldr.slice(0, 110).replace(/\s+\S*$/, '') + '…'
    : '';
  const videoUrl = `https://www.youtube.com/watch?v=${data?.videoId}`;

  return (
    <div className="digest-section" ref={ref}>
      <div className="digest-section-inner">

        {/* Copy */}
        <div className="digest-copy">
          <div className="digest-eyebrow">Daily digest</div>
          <h2 className="digest-heading">Set it on autopilot.</h2>
          <p className="digest-sub">Follow the channels you care about. Every morning, Headwater emails you summaries of what's new — so you can decide what's worth your time before you open YouTube.</p>
          <Link to="/register" className="btn-primary digest-cta">Follow your first channel →</Link>
        </div>

        {/* Email card mockup */}
        <div className="digest-email-wrap">
          <div className="digest-email-window">
            <div className="digest-email-titlebar">
              <span className="digest-email-dot" />
              <span className="digest-email-dot" />
              <span className="digest-email-dot" />
              <span className="digest-email-titlebar-label">Inbox</span>
            </div>
            <div className="digest-email-chrome">
              <div className="digest-email-from">
                <div className="digest-email-sender">Headwater <span className="digest-email-addr">&lt;digest@headwaterhq.co&gt;</span></div>
                <div className="digest-email-subject">Your daily digest — 3 new videos</div>
              </div>
              {data && (
                <div className="digest-email-card">
                  {/* Real video */}
                  <div className="digest-email-row">
                    <a href={videoUrl} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0 }}>
                      <img src={data.thumbnailUrl} alt={data.title || ''} className="digest-email-thumb"
                        onError={(e) => { e.target.style.display = 'none'; }} />
                    </a>
                    <div className="digest-email-content">
                      {data.channelName && <div className="digest-email-channel">{data.channelName}</div>}
                      <div className="digest-email-title">{data.title}</div>
                      {data.verdict && (
                        <div className="digest-email-verdict" style={{ color: data.verdict.action === 'Watch' ? '#22d3ee' : data.verdict.action === 'Skip' ? '#334155' : '#8aa4c8' }}>
                          {data.verdict.action === 'Watch segment' ? `Watch ${data.verdict.segment}` : data.verdict.action}
                          {data.verdict.reason && <span className="digest-email-verdict-reason"> — {data.verdict.reason}</span>}
                        </div>
                      )}
                      {tldrFirst && <div className="digest-email-tldr">{tldrFirst}</div>}
                      <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="digest-email-watch">Watch →</a>
                    </div>
                  </div>
                  {/* Placeholder rows to convey multi-video digest */}
                  <div className="digest-email-divider" />
                  <div className="digest-email-row digest-email-row-muted">
                    <div className="digest-email-thumb-placeholder" />
                    <div className="digest-email-content">
                      <div className="digest-email-channel digest-placeholder-line" style={{ width: 80 }} />
                      <div className="digest-placeholder-line" style={{ width: '90%' }} />
                      <div className="digest-placeholder-line" style={{ width: '70%', marginTop: 4 }} />
                    </div>
                  </div>
                  <div className="digest-email-divider" />
                  <div className="digest-email-row digest-email-row-muted">
                    <div className="digest-email-thumb-placeholder" />
                    <div className="digest-email-content">
                      <div className="digest-email-channel digest-placeholder-line" style={{ width: 64 }} />
                      <div className="digest-placeholder-line" style={{ width: '80%' }} />
                      <div className="digest-placeholder-line" style={{ width: '55%', marginTop: 4 }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function CuratedSummary({ data }) {
  const { titleClaim, tldr, verdict, quotes = [], channelName, title, videoId, thumbnailUrl } = data;
  const quote = quotes[0];

  return (
    <div className="landing-demo-card">
      <div className="landing-demo-layout">

        {/* Left: thumbnail + meta */}
        <div className="landing-demo-left">
          <a href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noopener noreferrer" className="landing-thumb-link">
            <img src={thumbnailUrl} alt={title || ''} className="landing-thumb"
              onError={(e) => { e.target.closest('.landing-thumb-link').style.display = 'none'; }} />
          </a>
          {(channelName || title) && (
            <div className="landing-video-ref">
              <div className="landing-video-meta">
                {channelName && <span className="landing-video-channel">{channelName}</span>}
                {title && <span className="landing-video-title">{title}</span>}
              </div>
              <a href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noopener noreferrer" className="landing-yt-link">Watch on YouTube ↗</a>
            </div>
          )}
        </div>

        {/* Right: quote */}
        {quote && (
          <div className="landing-demo-right">
            <div className="landing-quote">"{quote.text}"</div>
          </div>
        )}

      </div>

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
  const [remaining, setRemaining] = useState(null); // free summaries left

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
      setError('Please enter a valid YouTube video URL.');
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
      const rem = res.headers.get('RateLimit-Remaining');
      if (rem !== null) setRemaining(Number(rem));
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
          <button className="btn-primary" onClick={() => document.querySelector('.landing-url-input')?.focus()}>Try it free</button>
        </div>
      </header>

      <div className="landing-hero">
        <h1 className="landing-headline">The signal, before the<br />feed gets to it.</h1>
        <p className="landing-sub">Paste any video link and get a Watch or Skip verdict, key topics, and standout quotes. Follow channels for a daily digest in your inbox.</p>

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

        <div className="landing-input-meta">
          {remaining !== null && !limitReached
            ? <span>{remaining} free summar{remaining === 1 ? 'y' : 'ies'} left — <Link to="/register" style={{ color: '#22d3ee' }}>sign up for unlimited</Link></span>
            : <span>3 free summaries · no account needed</span>}
        </div>

        {error && <div className="landing-input-error">{error}</div>}

        {limitReached && (
          <div className="landing-limit-box">
            You've used your 3 free summaries.{' '}
            <Link to="/register" style={{ color: '#22d3ee' }}>Sign up free</Link> to keep going.
          </div>
        )}
      </div>

      {/* Result or demo */}
      <div className="landing-demo">
        {!result && !loading && demoData && <div className="landing-example-label">Example output</div>}
        {loading && (
          <div className="loader" style={{ paddingTop: 32, paddingBottom: 32 }}>
            <div className="spinner" />
            <span>Reading the source.</span>
            <span className="loader-hint">Pulling the transcript and distilling what matters — usually about 15 seconds.</span>
          </div>
        )}

        {result && !loading && (
          <>
            <CuratedSummary data={result} />
            <div className="landing-inline-cta">
              <Link to="/register" className="btn-primary">Sign up to save this and follow channels →</Link>
              <span className="landing-inline-cta-sub">Free. No credit card required.</span>
            </div>
          </>
        )}

        {!result && !loading && demoData && (
          <>
            <CuratedSummary data={demoData} />
            <div className="landing-inline-cta">
              <button className="btn-primary" onClick={() => document.querySelector('.landing-url-input')?.focus()}>Try it free →</button>
              <span className="landing-inline-cta-sub">Free. No credit card required.</span>
            </div>
          </>
        )}
      </div>

      <DigestSection data={demoData} />

      <footer className="landing-footer">
        <span>© {new Date().getFullYear()} Headwater</span>
        <Link to="/login" className="landing-footer-link">Sign in</Link>
      </footer>

    </div>
  );
}
