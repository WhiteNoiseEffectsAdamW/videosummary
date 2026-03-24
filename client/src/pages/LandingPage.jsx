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

function DigestEmailMockup({ data }) {
  const tldrFirst = data?.tldr
    ? data.tldr.length <= 110
      ? data.tldr
      : data.tldr.slice(0, 110).replace(/\s+\S*$/, '') + '…'
    : '';
  const videoUrl = `https://www.youtube.com/watch?v=${data?.videoId}`;

  return (
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
            <div className="digest-email-subject">3 new videos from your channels</div>
          </div>
          {data && (
            <div className="digest-email-card">
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
  );
}

function CuratedSummary({ data }) {
  const { titleClaim, tldr, verdict, quotes = [], channelName, title, videoId, thumbnailUrl } = data;
  const quote = quotes[0];

  return (
    <div className="landing-demo-card">
      <div className="landing-demo-layout">
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
  const [remaining, setRemaining] = useState(null);

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
          <Link to="/register" className="btn-primary">Create account</Link>
        </div>
      </header>

      {/* Hero — digest first */}
      <div className="landing-hero">
        <h1 className="landing-headline">Upstream of<br /><span style={{ color: '#22d3ee' }}>the algorithm.</span></h1>
        <p className="landing-sub">Too many channels, not enough time. Follow the ones you care about and get a morning digest of what's new — so you know what's worth watching before you hit play.</p>
        <Link to="/register" className="btn-primary landing-hero-cta">Follow your first channel →</Link>
        <div className="landing-signin-hint">Already have an account? <Link to="/login" style={{ color: '#22d3ee' }}>Sign in</Link></div>
      </div>

      {/* Digest section — two-column with copy + email mockup */}
      <div className="digest-section fade-in-visible">
        <div className="digest-section-inner">
          <div className="digest-copy">
            <div className="digest-eyebrow">Every morning</div>
            <h2 className="digest-heading">Every channel you follow, distilled.</h2>
            <p className="digest-sub">New video from a channel you follow? You'll know if it's worth your time before you hit play.</p>
          </div>
          <div className="digest-email-wrap">
            <DigestEmailMockup data={demoData} />
          </div>
        </div>
      </div>

      {/* Summarizer — secondary, below the fold */}
      <div className="landing-summarizer-section">
        <div className="landing-summarizer-eyebrow">Or try an instant summary</div>
        <p className="landing-summarizer-desc">Paste any video URL and see what Headwater pulls out — verdict, key points, standout quotes.</p>

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
            <Link to="/register" style={{ color: '#22d3ee' }}>Sign up free</Link> to keep going.
          </div>
        )}

        {loading && (
          <div className="loader" style={{ paddingTop: 32, paddingBottom: 32 }}>
            <div className="spinner" />
            <span>Reading the source.</span>
            <span className="loader-hint">Pulling the transcript and distilling what matters — usually about 15 seconds.</span>
          </div>
        )}

        {!result && !loading && demoData && (
          <div style={{ marginTop: 40, textAlign: 'left' }}>
            <div className="landing-example-label">Example summary</div>
            <CuratedSummary data={demoData} />
          </div>
        )}

        {result && !loading && (
          <div style={{ textAlign: 'left' }}>
            <CuratedSummary data={result} />
            <div className="landing-inline-cta">
              <Link to="/register" className="btn-primary">Get this every morning — follow your channels →</Link>
              <span className="landing-inline-cta-sub">Free. No credit card required.</span>
            </div>
          </div>
        )}
      </div>

      <footer className="landing-footer">
        <span>© {new Date().getFullYear()} Headwater</span>
        <Link to="/login" className="landing-footer-link">Sign in</Link>
      </footer>

    </div>
  );
}
