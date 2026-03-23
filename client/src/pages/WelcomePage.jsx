import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import SummaryDisplay from '../components/SummaryDisplay.jsx';
import ErrorBoundary from '../components/ErrorBoundary.jsx';

export default function WelcomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  // Step 1: summarize
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  // Step 2: follow channels
  const [channelInput, setChannelInput] = useState('');
  const [channelLoading, setChannelLoading] = useState(false);
  const [channelError, setChannelError] = useState(null);
  const [followed, setFollowed] = useState([]);

  function finish() {
    localStorage.setItem('onboarded', '1');
    navigate('/videos');
  }

  async function handleSummarize(e) {
    e.preventDefault();
    if (!url.trim()) return;
    if (!url.match(/(?:youtube\.com|youtu\.be)/)) {
      setError('Please enter a valid YouTube video URL.');
      return;
    }
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch(`/api/summary?url=${encodeURIComponent(url.trim())}`, { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleFollow(e) {
    e.preventDefault();
    if (!channelInput.trim()) return;
    setChannelLoading(true);
    setChannelError(null);
    try {
      const resolveRes = await fetch(`/api/channels/resolve?url=${encodeURIComponent(channelInput.trim())}`, { credentials: 'include' });
      const resolved = await resolveRes.json();
      if (!resolveRes.ok) throw new Error(resolved.error);

      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId: resolved.channelId, channelName: resolved.channelName || resolved.channelId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFollowed((prev) => [...prev, resolved.channelName || resolved.channelId]);
      setChannelInput('');
    } catch (err) {
      setChannelError(err.message);
    } finally {
      setChannelLoading(false);
    }
  }

  const firstName = user?.name ? user.name.split(' ')[0] : null;

  return (
    <div className="welcome-page">
      <div className="welcome-step">

        {step === 1 && (
          <>
            <div className="welcome-header">
              <h1>Welcome{firstName ? `, ${firstName}` : ''}.</h1>
              <p>Paste a video you've been meaning to watch — see what it's actually worth.</p>
            </div>

            <form className="form-row" onSubmit={handleSummarize}>
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

            {error && <div className="error-box">{error}</div>}

            {loading && (
              <div className="loader">
                <div className="spinner" />
                <span>Reading the source.</span>
                <span className="loader-hint">Pulling the transcript and distilling what matters — usually about 15 seconds.</span>
              </div>
            )}

            {data && (
              <>
                <ErrorBoundary><SummaryDisplay data={data} /></ErrorBoundary>
                <div className="welcome-actions">
                  <button className="btn-primary" onClick={() => setStep(2)}>
                    Set up your morning digest →
                  </button>
                  <button className="welcome-skip" onClick={finish}>Skip setup</button>
                </div>
              </>
            )}

            {!data && !loading && (
              <button className="welcome-skip" style={{ marginTop: 16 }} onClick={() => setStep(2)}>
                Skip to channel setup →
              </button>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <div className="welcome-header">
              <h1>Build your digest.</h1>
              <p>We'll email you summaries of new videos every morning — no algorithm, no noise.</p>
            </div>

            <form className="add-channel-form" onSubmit={handleFollow}>
              <div className="add-channel-inputs">
                <input
                  className="url-input channel-url-input"
                  type="text"
                  placeholder="youtube.com/@CalNewportMedia"
                  value={channelInput}
                  onChange={(e) => setChannelInput(e.target.value)}
                  disabled={channelLoading}
                  autoFocus
                />
                <button className="btn-summarize" type="submit" disabled={channelLoading}>
                  {channelLoading ? 'Adding…' : 'Add to digest'}
                </button>
              </div>
              {channelError && <div className="auth-error" style={{ marginTop: 8 }}>{channelError}</div>}
            </form>

            {followed.length > 0 && (
              <ul className="welcome-followed">
                {followed.map((name, i) => (
                  <li key={i}>✓ {name}</li>
                ))}
              </ul>
            )}

            <div className="welcome-actions" style={{ marginTop: followed.length > 0 ? 24 : 40 }}>
              <button className="btn-primary" onClick={finish}>
                {followed.length > 0 ? 'Go to My Videos →' : 'Skip for now →'}
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
