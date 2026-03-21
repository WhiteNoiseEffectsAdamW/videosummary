require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const passport = require('./middleware/passport');
const { migrate } = require('./db');
const summaryRouter = require('./routes/summary');
const authRouter = require('./routes/auth');
const subscriptionsRouter = require('./routes/subscriptions');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Session store — Postgres on Railway, memory store locally
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
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
app.use('/api/summary', summaryRouter);

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

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

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
