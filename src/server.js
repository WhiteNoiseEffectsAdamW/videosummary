require('dotenv').config();
const Sentry = require('@sentry/node');
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
  });
}
const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const passport = require('./middleware/passport');
const { migrate } = require('./db');
const summaryRouter = require('./routes/summary');
const authRouter = require('./routes/auth');
const subscriptionsRouter = require('./routes/subscriptions');
const channelsRouter = require('./routes/channels');
const videosRouter = require('./routes/videos');
const { errorHandler } = require('./middleware/errorHandler');
const { startPolling } = require('./jobs/poll-channels');
const { startDigestJob } = require('./jobs/send-digests');
const { startNudgeJob } = require('./jobs/send-nudges');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust Railway's reverse proxy so secure cookies work over HTTPS
app.set('trust proxy', 1);

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
  : null; // null = allow all origins (safe when frontend is same-origin on Railway)
app.use(cors({
  origin: allowedOrigins
    ? (origin, cb) => {
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        cb(new Error('Not allowed by CORS'));
      }
    : true,
  credentials: true,
}));
app.use(express.json());

// Session store — Postgres on Railway, memory store locally
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
};

if (process.env.DATABASE_URL) {
  const PgSession = require('connect-pg-simple')(session);
  sessionConfig.store = new PgSession({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
  });
}

app.use(session(sessionConfig));
app.use(passport.initialize());
app.use(passport.session());

// Health check
app.get('/health', (req, res) => res.json({ ok: true }));

// API routes
app.use('/api/auth', authRouter);
app.use('/api/subscriptions', subscriptionsRouter);
app.use('/api/channels', channelsRouter);
app.use('/api/videos', videosRouter);
app.use('/api/summary', summaryRouter);

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  const fs = require('fs');
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  const { findByVideoId } = require('./models/summary');
  const APP_URL = process.env.APP_URL || 'https://headwater.app';

  function escAttr(str) {
    return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  app.use(express.static(clientDist));

  // Per-video OG tags for share pages
  app.get('/s/:videoId', async (req, res) => {
    try {
      const summary = await findByVideoId(req.params.videoId);
      if (!summary) return res.sendFile(path.join(clientDist, 'index.html'));

      const title = escAttr(`Headwater · "${summary.title || req.params.videoId}"`);
      const description = escAttr(summary.summary?.tldr || 'AI-generated video summary from Headwater.');
      const image = `https://img.youtube.com/vi/${req.params.videoId}/maxresdefault.jpg`;
      const url = `${APP_URL}/s/${req.params.videoId}`;

      let html = fs.readFileSync(path.join(clientDist, 'index.html'), 'utf8');
      html = html
        .replace(/(<title>)[^<]*(<\/title>)/, `$1${title}$2`)
        .replace(/(<meta property="og:title"[^>]*content=")[^"]*(")/,  `$1${title}$2`)
        .replace(/(<meta property="og:description"[^>]*content=")[^"]*(")/,  `$1${description}$2`)
        .replace(/(<meta property="og:image"[^>]*content=")[^"]*(")/,  `$1${image}$2`)
        .replace(/(<meta property="og:url"[^>]*content=")[^"]*(")/,  `$1${url}$2`)
        .replace(/(<meta name="twitter:title"[^>]*content=")[^"]*(")/,  `$1${title}$2`)
        .replace(/(<meta name="twitter:description"[^>]*content=")[^"]*(")/,  `$1${description}$2`)
        .replace(/(<meta name="twitter:image"[^>]*content=")[^"]*(")/,  `$1${image}$2`);

      res.send(html);
    } catch {
      res.sendFile(path.join(clientDist, 'index.html'));
    }
  });

  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

if (process.env.SENTRY_DSN) Sentry.setupExpressErrorHandler(app);
app.use(errorHandler);

async function start() {
  // Validate required env vars before accepting traffic
  const required = ['ANTHROPIC_API_KEY'];
  if (process.env.NODE_ENV === 'production') required.push('SESSION_SECRET');
  for (const key of required) {
    if (!process.env[key]) throw new Error(`Missing required env var: ${key}`);
  }

  await migrate();

  // Verify yt-dlp is available at startup
  const { execFile } = require('child_process');
  const ytDlp = process.env.YT_DLP_PATH || 'yt-dlp';
  execFile(ytDlp, ['--version'], (err, stdout) => {
    if (err) console.warn('[startup] yt-dlp not found:', err.message);
    else console.log('[startup] yt-dlp version:', stdout.trim());
  });

  startPolling();
  startDigestJob();
  startNudgeJob();

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
