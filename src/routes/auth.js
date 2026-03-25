const router = require('express').Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const passport = require('../middleware/passport');
const { findByEmail, create, updatePreferences, deleteById, setResetToken, findByResetToken, clearResetToken, setVerificationToken, findByVerificationToken, markEmailVerified, countAll } = require('../models/user');
const { sendPasswordReset, sendVerificationEmail, sendDigest } = require('../services/email');
const { db } = require('../db');
const { findByChannelIdsSince } = require('../models/summary');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ error: 'Too many login attempts. Try again in 15 minutes.' }),
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ error: 'Too many accounts created from this IP. Try again later.' }),
});

function serializeUser(u) {
  return { id: u.id, email: u.email, name: u.name, emailDigest: u.email_digest !== false, emailVerified: !!u.email_verified };
}

async function issueVerification(user) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  await setVerificationToken(user.id, token, expires);
  const APP_URL = process.env.APP_URL || 'https://headwater.app';
  await sendVerificationEmail(user.email, `${APP_URL}/verify-email?token=${token}`);
}

// POST /api/auth/register
router.post('/register', registerLimiter, async (req, res, next) => {
  try {
    const { email, password, name, emailDigest } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });

    const maxUsers = parseInt(process.env.MAX_USERS || '50', 10);
    const userCount = await countAll();
    if (userCount >= maxUsers) return res.status(503).json({ error: 'Registration is currently closed. Check back soon.' });

    const existing = await findByEmail(email);
    if (existing) return res.status(409).json({ error: 'An account with that email already exists.' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await create({ email, passwordHash, name, emailDigest: emailDigest === true });

    // Send verification email (non-blocking — don't fail registration if email fails)
    issueVerification(user).catch((err) => console.error('[verify] Failed to send verification email:', err));

    req.login(user, (err) => {
      if (err) return next(err);
      res.status(201).json(serializeUser(user));
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', loginLimiter, (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ error: info?.message || 'Invalid email or password.' });

    req.login(user, (err) => {
      if (err) return next(err);
      res.json(serializeUser(user));
    });
  })(req, res, next);
});

// POST /api/auth/logout
router.post('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.json({ ok: true });
  });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated.' });
  res.json(serializeUser(req.user));
});

// PATCH /api/auth/me — update preferences
router.patch('/me', async (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated.' });
  try {
    const { emailDigest } = req.body;
    const updated = await updatePreferences(req.user.id, { emailDigest });
    res.json(serializeUser(updated));
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });
    const user = await findByEmail(email);
    // Always respond OK to avoid leaking which emails are registered
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await setResetToken(user.id, token, expires);
      const APP_URL = process.env.APP_URL || 'https://headwater.app';
      await sendPasswordReset(user.email, `${APP_URL}/reset-password?token=${token}`);
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and password are required.' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    const user = await findByResetToken(token);
    if (!user) return res.status(400).json({ error: 'This reset link is invalid or has expired.' });
    const passwordHash = await bcrypt.hash(password, 12);
    await clearResetToken(user.id, passwordHash);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/verify-email
router.post('/verify-email', async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token is required.' });
    const user = await findByVerificationToken(token);
    if (!user) return res.status(400).json({ error: 'This verification link is invalid or has expired.' });
    await markEmailVerified(user.id);
    // Update session user if they're logged in
    if (req.user?.id === user.id) req.user.email_verified = true;
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/resend-verification
router.post('/resend-verification', async (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated.' });
  try {
    if (req.user.email_verified) return res.status(400).json({ error: 'Email already verified.' });
    await issueVerification(req.user);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/preview-digest — send a preview digest to the logged-in user
router.post('/preview-digest', async (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated.' });
  try {
    const channelIds = await db('subscriptions')
      .where({ user_id: req.user.id, active: true })
      .pluck('channel_id');
    if (!channelIds.length) return res.status(400).json({ error: 'No channels followed yet.' });
    const summaries = await findByChannelIdsSince(channelIds, new Date(0)); // no date filter
    if (!summaries.length) return res.status(400).json({ error: 'No summaries available yet.' });
    await sendDigest(req.user.email, summaries.slice(0, 10));
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/auth/me — permanently delete account
router.delete('/me', async (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated.' });
  try {
    await deleteById(req.user.id);
    req.logout((err) => {
      if (err) return next(err);
      res.json({ ok: true });
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/preview-nudge — send the nudge email to the logged-in user for preview
router.post('/preview-nudge', async (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated.' });
  try {
    const { sendNudge } = require('../services/email');
    await sendNudge(req.user.email);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
