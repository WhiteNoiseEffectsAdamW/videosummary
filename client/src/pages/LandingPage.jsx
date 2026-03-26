import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const DEMO_VIDEO_ID = 'UclrVWafRAI';

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
  const tldrFirst = (() => {
    const tldr = data?.tldr;
    if (!tldr) return '';
    const sentences = tldr.match(/^.+?[.!?](?:\s+.+?[.!?])?/);
    return sentences ? sentences[0] : tldr;
  })();
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
            <div className="digest-email-sender">Headwater <span className="digest-email-addr">&lt;digest@headwaterapp.com&gt;</span></div>
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
                  {(data.titleClaim?.reality || tldrFirst) && (
                    <div className="digest-email-tldr">{data.titleClaim?.reality || tldrFirst}</div>
                  )}
                  {data.quotes?.[0] && <div className="digest-email-quote">&ldquo;{data.quotes[0].text}&rdquo;</div>}
                  <div className="digest-email-links">
                    <a href={`/s/${data.videoId}`} className="digest-email-fullsummary">Full summary →</a>
                    <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="digest-email-watch">Watch →</a>
                  </div>
                </div>
              </div>
              <div className="digest-email-peek">
                <div className="digest-email-divider" />
                <div className="digest-email-row">
                  <img src="https://img.youtube.com/vi/3E7hkPZ-HTk/mqdefault.jpg" alt="Cal Newport TEDx" className="digest-email-thumb" onError={(e) => { e.target.style.display = 'none'; }} />
                  <div className="digest-email-content">
                    <div className="digest-email-channel">Cal Newport</div>
                    <div className="digest-email-title">Quit Social Media. Your Career May Depend on It.</div>
                    <div className="digest-email-tldr">Title delivers. Newport's argument is cold career math: the people around you are too distracted to compete with, if you're willing to opt out of what distracts them.</div>
                    <div className="digest-email-quote">&ldquo;The ability to focus without distraction is becoming increasingly rare and increasingly valuable.&rdquo;</div>
                    <div className="digest-email-links">
                      <span className="digest-email-fullsummary">Full summary →</span>
                      <span className="digest-email-watch">Watch →</span>
                    </div>
                  </div>
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
  const { titleClaim, tldr, quotes = [], channelName, title, videoId, thumbnailUrl } = data;
  const quote = quotes[0];

  return (
    <div className="landing-demo-card">
      <div className="landing-demo-layout">
        <div className="landing-demo-left">
          <a href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noopener noreferrer" className="landing-thumb-link">
            <img src={thumbnailUrl} alt={title || ''} className="landing-thumb"
              onLoad={(e) => {
                if (e.target.src.includes('maxresdefault') && e.target.naturalWidth <= 120) {
                  e.target.src = e.target.src.replace('maxresdefault', 'hqdefault');
                }
              }}
              onError={(e) => {
                if (e.target.src.includes('hqdefault')) {
                  e.target.closest('.landing-thumb-link').style.display = 'none';
                } else {
                  e.target.src = e.target.src.replace('maxresdefault', 'hqdefault');
                }
              }} />
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
          <Link to="/register" className="btn-primary">Get early access</Link>
        </div>
      </header>

      {/* Hero — lean, let the demo sell it */}
      <div className="landing-hero">
        <h1 className="landing-headline">Upstream of<br /><span style={{ color: '#22d3ee' }}>the algorithm.</span></h1>
        <p className="landing-sub">Follow channels. We summarize what's new. Skip the rest.</p>
        <div className="landing-hero-beta">Free while we're in beta.</div>
      </div>

      {/* Summarizer — demo first, input below */}
      <div className="landing-summarizer-section" id="demo">

        {/* Demo summary — visible immediately, no URL required */}
        {!result && !loading && demoData && (
          <div style={{ textAlign: 'left', marginBottom: 32 }}>
            <div className="landing-demo-trust">The video, not the title.</div>
            <CuratedSummary data={demoData} />
          </div>
        )}

        {/* User's result */}
        {result && !loading && (
          <div style={{ textAlign: 'left' }}>
            <CuratedSummary data={result} />
            <div className="landing-digest-pitch">
              <div className="landing-digest-pitch-headline">Upstream of the algorithm.</div>
              <p className="landing-digest-pitch-body">Follow the channels you care about and get a morning digest of what's new — title, summary, standout quote. Set it up once and know what's worth your time every morning.</p>
              <Link to="/register" className="btn-primary">Follow your first channel →</Link>
              <span className="landing-inline-cta-sub">Free. No credit card required.</span>
            </div>
          </div>
        )}

        {/* Loader */}
        {loading && (
          <div className="loader" style={{ paddingTop: 32, paddingBottom: 32 }}>
            <div className="spinner" />
            <span>Reading the source.</span>
            <span className="loader-hint">Pulling the transcript and distilling what matters — usually about 15 seconds.</span>
          </div>
        )}

        {/* Input — try your own */}
        {!result && (
          <>
            <div className="landing-try-label">Try it with your own video</div>
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

            {error && (
          error.toLowerCase().includes('transcript') ? (
            <div className="landing-transcript-error">
              <div className="landing-transcript-error-title">No transcript available</div>
              <p className="landing-transcript-error-body">This video doesn't have captions we can read — the creator may have disabled them, or it's a live stream or short. Try a different video.</p>
              <button className="landing-transcript-error-retry" onClick={() => { setError(null); setUrl(''); }}>Try another video</button>
            </div>
          ) : (
            <div className="landing-input-error">{error}</div>
          )
        )}

            {limitReached && (
              <div className="landing-limit-box">
                You've used your 3 free summaries.{' '}
                <Link to="/register" style={{ color: '#22d3ee' }}>Sign up free</Link> to keep going.
              </div>
            )}

          </>
        )}
      </div>

      {/* Digest section — what happens after you sign up */}
      <div className="digest-section fade-in-visible">
        <div className="digest-section-inner">
          <div className="digest-copy">
            <div className="digest-eyebrow">Every morning</div>
            <h2 className="digest-heading">Every channel you follow, distilled.</h2>
            <p className="digest-sub">Before the algorithm picks for you.</p>
          </div>
          <div className="digest-email-wrap">
            <DigestEmailMockup data={demoData} />
          </div>
        </div>
      </div>

      <div className="landing-digest-cta">
        <div className="landing-or-signup-how">Add any YouTube channel by name or URL — no Google account needed.</div>
        <Link to="/register" className="btn-primary">Follow your first channel →</Link>
      </div>

      <footer className="landing-footer">
        <span>© {new Date().getFullYear()} Headwater</span>
        <Link to="/login" className="landing-footer-link">Sign in</Link>
      </footer>

    </div>
  );
}
