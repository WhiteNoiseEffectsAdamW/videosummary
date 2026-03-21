import React, { useState } from 'react';
import SummaryDisplay from './components/SummaryDisplay.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import './app.css';

export default function App() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  async function handleSubmit(e) {
    e.preventDefault();
    if (!url.trim()) return;
    if (!url.match(/(?:youtube\.com|youtu\.be)/)) {
      setError('Please enter a valid YouTube URL.');
      return;
    }
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch(`/api/summary?url=${encodeURIComponent(url.trim())}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <header className="hero">
        <h1>Summarize any<br /><span>YouTube video</span></h1>
        <p>Paste a link and get key topics, quotes, and a TL;DR — in seconds.</p>

        <div className="form-wrap">
          <form className="form-row" onSubmit={handleSubmit}>
            <input
              className="url-input"
              type="text"
              placeholder="https://www.youtube.com/watch?v=..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={loading}
              autoFocus
            />
            <button className="btn-summarize" type="submit" disabled={loading}>
              {loading ? 'Summarizing…' : 'Summarize'}
            </button>
          </form>

        </div>
      </header>

      <main className="content">
        {error && (
          <div className="error-box">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="8" cy="8" r="7.5" stroke="currentColor" />
              <path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            {error}
          </div>
        )}

        {loading && (
          <div className="loader">
            <div className="spinner" />
            <span>Fetching transcript and generating summary…</span>
          </div>
        )}

        {data && <ErrorBoundary><SummaryDisplay data={data} /></ErrorBoundary>}
      </main>
    </div>
  );
}
