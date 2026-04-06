import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext.jsx';
import Nav from './components/Nav.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import SummaryDisplay from './components/SummaryDisplay.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import FollowingPage from './pages/ChannelsPage.jsx';
import VideosPage from './pages/VideosPage.jsx';
import WelcomePage from './pages/WelcomePage.jsx';
import LandingPage from './pages/LandingPage.jsx';
import PublicSummaryPage from './pages/PublicSummaryPage.jsx';
import PrivacyPage from './pages/PrivacyPage.jsx';
import TermsPage from './pages/TermsPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';
import VerifyEmailPage from './pages/VerifyEmailPage.jsx';
import AccountPage from './pages/AccountPage.jsx';
// import UpgradePage from './pages/UpgradePage.jsx'; // re-enable with Stripe
import './app.css';

function RequireAuth({ children }) {
  const { user } = useAuth();
  if (user === undefined) return <div className="loading-screen">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AuthGate({ children }) {
  const { user } = useAuth();
  if (user === undefined) return <div className="loading-screen">Loading…</div>;
  if (!user) return <LandingPage />;
  return children;
}

function SummarizerPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const navigate = useNavigate();

  // Auto-load if ?v=VIDEO_ID is in the URL (e.g. from My Videos)
  useEffect(() => {
    const videoId = searchParams.get('v');
    if (!videoId) return;
    setSearchParams({}, { replace: true });
    setLoading(true);
    setError(null);
    setData(null);
    fetch(`/api/summary/${videoId}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        navigate(`/s/${json.slug || json.videoId}`, { replace: true });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
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
    setData(null);
    try {
      const res = await fetch(`/api/summary?url=${encodeURIComponent(url.trim())}`, { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      navigate(`/s/${json.slug || json.videoId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <header className="hero">
        <h1>Upstream of<br /><span>the algorithm.</span></h1>
        <p>Any YouTube video, distilled to what matters.</p>
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
            <span>Reading the source.</span>
            <span className="loader-hint">Summarizeing what matters — usually about 15 seconds.</span>
          </div>
        )}
        {data && <ErrorBoundary><SummaryDisplay data={data} /></ErrorBoundary>}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Nav />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/s/:slug" element={<PublicSummaryPage />} />
          <Route path="/welcome" element={<RequireAuth><WelcomePage /></RequireAuth>} />
          <Route path="/following" element={<RequireAuth><FollowingPage /></RequireAuth>} />
          <Route path="/channels" element={<Navigate to="/following" replace />} />
          <Route path="/videos" element={<RequireAuth><VideosPage /></RequireAuth>} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/account" element={<RequireAuth><AccountPage /></RequireAuth>} />
          {/* <Route path="/upgrade" element={<RequireAuth><UpgradePage /></RequireAuth>} /> re-enable with Stripe */}
          <Route path="/" element={<AuthGate><SummarizerPage /></AuthGate>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
