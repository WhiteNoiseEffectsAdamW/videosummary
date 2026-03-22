import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const DEMO_VIDEO_ID = 'UclrVWafRAI';

const VERDICT_COLOR = { Watch: '#22c55e', Skip: '#f59e0b', 'Watch segment': '#7c6fff' };

function LandingDemo({ data }) {
  const { titleClaim, tldr, verdict, quotes = [], channelName, title, videoId, thumbnailUrl } = data;
  const quote = quotes[0];

  return (
    <div className="landing-demo-card">

      {/* Thumbnail + video reference */}
      <a
        href={`https://www.youtube.com/watch?v=${videoId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="landing-thumb-link"
      >
        <img
          src={thumbnailUrl}
          alt={title || ''}
          className="landing-thumb"
          onError={(e) => { e.target.closest('.landing-thumb-link').style.display = 'none'; }}
        />
      </a>
      {(channelName || title) && (
        <div className="landing-video-ref">
          {channelName && <span className="landing-video-channel">{channelName}</span>}
          {title && <span className="landing-video-title">{title}</span>}
        </div>
      )}

      {/* Title vs Reality */}
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

      {/* TL;DR */}
      {tldr && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="card-label">TL;DR</div>
          <p className="tldr-text">{tldr}</p>
        </div>
      )}

      {/* Verdict */}
      {verdict && (
        <div className="landing-verdict">
          <span className="landing-verdict-action" style={{ color: VERDICT_COLOR[verdict.action] || '#aaa' }}>
            {verdict.action === 'Watch segment' ? `Watch ${verdict.segment}` : verdict.action}
          </span>
          <span className="landing-verdict-reason">{verdict.reason}</span>
        </div>
      )}

      {/* Quote */}
      {quote && (
        <div className="landing-quote">"{quote.text}"</div>
      )}

      {/* Inline CTA */}
      <div className="landing-inline-cta">
        <Link to="/register" className="btn-primary">Get this for your channels →</Link>
        <span className="landing-inline-cta-sub">Free to try. No credit card required.</span>
      </div>

    </div>
  );
}

export default function LandingPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch(`/api/summary/${DEMO_VIDEO_ID}`)
      .then((r) => r.json())
      .then((json) => { if (!json.error) setData(json); })
      .catch(() => {});
  }, []);

  return (
    <div className="landing-page">

      {/* Nav */}
      <header className="landing-nav">
        <span className="landing-brand">Headwater</span>
        <div className="landing-nav-right">
          <Link to="/login" className="landing-nav-link">Sign in</Link>
          <Link to="/register" className="btn-primary">Try it free</Link>
        </div>
      </header>

      {/* Hero */}
      <div className="landing-hero">
        <h1 className="landing-headline">Know if a video is worth watching<br />before you watch it.</h1>
        <p className="landing-sub">Paste any YouTube link and get a verdict, key topics, and notable quotes — or follow channels for a daily digest in your inbox.</p>
        <Link to="/register" className="btn-primary landing-hero-cta">Try it free</Link>
      </div>

      {/* Demo */}
      {data && (
        <div className="landing-demo">
          <div className="landing-demo-label">Here's what a summary looks like</div>
          <LandingDemo data={data} />
        </div>
      )}

      {/* Footer */}
      <footer className="landing-footer">
        <span>© {new Date().getFullYear()} Headwater</span>
        <Link to="/login" className="landing-footer-link">Sign in</Link>
      </footer>

    </div>
  );
}
