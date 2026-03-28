import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import SummaryDisplay from '../components/SummaryDisplay.jsx';
import ErrorBoundary from '../components/ErrorBoundary.jsx';

export default function PublicSummaryPage() {
  const { videoId } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`/api/summary/${videoId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setData(json);
      })
      .catch((err) => setError(err.message));
  }, [videoId]);

  useEffect(() => {
    if (!data) return;
    const title = data.title ? `Headwater Summary — ${data.title}` : 'Headwater Summary';
    const desc = data.tldr?.slice(0, 160) || 'AI-generated video summary';
    const image = data.thumbnailUrl;

    document.title = title;
    setMeta('og:title', title);
    setMeta('og:description', desc);
    setMeta('og:image', image);
    setMeta('og:type', 'website');
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', title);
    setMeta('twitter:description', desc);
    setMeta('twitter:image', image);
  }, [data]);

  function setMeta(property, content) {
    if (!content) return;
    const attr = property.startsWith('og:') ? 'property' : 'name';
    let el = document.querySelector(`meta[${attr}="${property}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, property);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  }

  return (
    <div className="public-summary-page">
      {/* Minimal header */}
      {!user && (
        <header className="public-header">
          <div className="public-brand-group">
            <Link to="/" className="public-brand">Headwater</Link>
            <span className="public-brand-sub">Know what's worth watching before you click.</span>
          </div>
          <Link to="/register" className="btn-primary public-cta">Try it free</Link>
        </header>
      )}

      <div className={`public-content${!user ? ' public-content-with-bar' : ''}`}>
        {error && <p style={{ color: '#ef4444', padding: '48px 0' }}>{error}</p>}
        {!data && !error && (
          <div className="loader" style={{ paddingTop: 64 }}>
            <div className="spinner" />
            <span>Loading summary…</span>
          </div>
        )}
        {data && (
          <ErrorBoundary><SummaryDisplay data={data} /></ErrorBoundary>
        )}
      </div>

      {/* Sticky signup bar — only for logged-out users */}
      {!user && (
        <div className="public-sticky-bar">
          <span className="public-sticky-tagline">Follow your channels. Get summaries like this every morning.</span>
          <Link to="/register" className="btn-primary public-sticky-cta">Try Headwater free →</Link>
        </div>
      )}
    </div>
  );
}
