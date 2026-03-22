import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import SummaryDisplay from '../components/SummaryDisplay.jsx';
import ErrorBoundary from '../components/ErrorBoundary.jsx';

export default function PublicSummaryPage() {
  const { videoId } = useParams();
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

  return (
    <div className="public-summary-page">
      {/* Minimal header */}
      <header className="public-header">
        <Link to="/" className="public-brand">Headwater</Link>
        <Link to="/register" className="btn-primary public-cta">Try it free</Link>
      </header>

      <div className="public-content">
        {error && <p style={{ color: '#ef4444', padding: '48px 0' }}>{error}</p>}
        {!data && !error && (
          <div className="loader" style={{ paddingTop: 64 }}>
            <div className="spinner" />
            <span>Loading summary…</span>
          </div>
        )}
        {data && (
          <>
            <ErrorBoundary><SummaryDisplay data={data} /></ErrorBoundary>
            <div className="public-signup-block">
              <div className="public-signup-text">Get summaries like this every morning for the channels you follow.</div>
              <Link to="/register" className="btn-primary">Try Headwater free →</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
