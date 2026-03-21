const router = require('express').Router();
const bcrypt = require('bcryptjs');
const passport = require('../middleware/passport');
const { findByEmail, create } = require('../models/user');

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });

    const existing = await findByEmail(email);
    if (existing) return res.status(409).json({ error: 'An account with that email already exists.' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await create({ email, passwordHash, name });

    req.login(user, (err) => {
      if (err) return next(err);
      res.status(201).json({ id: user.id, email: user.email, name: user.name });
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ error: info?.message || 'Invalid email or password.' });

    req.login(user, (err) => {
      if (err) return next(err);
      res.json({ id: user.id, email: user.email, name: user.name });
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
  res.json({ id: req.user.id, email: req.user.email, name: req.user.name });
});

module.exports = router;
