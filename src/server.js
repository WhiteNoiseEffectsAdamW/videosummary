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
const ogRouter = require('./routes/og');
const billingRouter = require('./routes/billing');
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
// Stripe webhook needs raw body — must be before express.json()
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), billingRouter);

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
app.use('/api/og', ogRouter);
app.use('/api/billing', billingRouter);

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  const fs = require('fs');
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  const { findByVideoId, findBySlug } = require('./models/summary');
  const APP_URL = process.env.APP_URL || 'https://headwater.app';

  function escAttr(str) {
    return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  app.use(express.static(clientDist));

  // Serve static OG images directly from client/public — bypasses Vite/dist
  // pipeline so these files are guaranteed present regardless of build caching
  const ogImageDir = path.join(__dirname, '..', 'client', 'public');
  for (const name of ['og-image-light.png', 'og-image-dark.png']) {
    app.get(`/${name}`, (req, res) => {
      res.set('Cache-Control', 'public, max-age=86400');
      res.sendFile(path.join(ogImageDir, name));
    });
  }

  // Per-video OG tags for share pages
  app.get('/s/:slug', async (req, res) => {
    try {
      const { slug } = req.params;
      const isLegacyId = /^[a-zA-Z0-9_-]{11}$/.test(slug);
      const summary = isLegacyId ? await findByVideoId(slug) : await findBySlug(slug);
      if (!summary) return res.sendFile(path.join(clientDist, 'index.html'));

      // Redirect legacy YouTube ID URLs to slug URL
      if (isLegacyId && summary.slug) return res.redirect(301, `/s/${summary.slug}`);

      const title = escAttr(`${summary.title || slug} — Headwater Summary`);
      const description = escAttr(summary.summary?.tldr || 'AI-generated video summary from Headwater.');
      const image = `${APP_URL}/api/og/${summary.video_id}`;
      const url = `${APP_URL}/s/${summary.slug || slug}`;

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
