import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SummaryDisplay from '../components/SummaryDisplay.jsx';
import ErrorBoundary from '../components/ErrorBoundary.jsx';

const DEMO_VIDEO_ID = 'UclrVWafRAI';

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
        <p className="landing-sub">Headwater summarizes YouTube videos and delivers a daily digest of your followed channels — verdict, key topics, and notable quotes included.</p>
        <Link to="/register" className="btn-primary landing-hero-cta">Try it free</Link>
      </div>

      {/* Demo summary */}
      {data && (
        <div className="landing-demo">
          <div className="landing-demo-label">Here's what a summary looks like</div>

          {/* Title vs Reality — featured at top */}
          {data.titleClaim?.claim && data.titleClaim?.reality && (
            <div className="card card-title-claim landing-featured-card">
              <div className="card-label">Title vs Reality</div>
              <div className="title-claim-row">
                <span className="title-claim-label">Promised</span>
                <span className="title-claim-text">{data.titleClaim.claim}</span>
              </div>
              <div className="title-claim-row">
                <span className="title-claim-label">Delivered</span>
                <span className="title-claim-text">{data.titleClaim.reality}</span>
              </div>
            </div>
          )}

          <ErrorBoundary><SummaryDisplay data={data} /></ErrorBoundary>

          <div className="landing-demo-cta">
            <Link to="/register" className="btn-primary">Get this for your channels →</Link>
            <p className="landing-demo-cta-sub">Free to try. No credit card required.</p>
          </div>
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
