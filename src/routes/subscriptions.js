const router = require('express').Router();
const requireAuth = require('../middleware/requireAuth');
const { findByUserId, create, remove, setDigest, setIncludeShorts } = require('../models/subscription');
const { db } = require('../db');

// All routes require login
router.use(requireAuth);

// GET /api/subscriptions — list my subscriptions
router.get('/', async (req, res, next) => {
  try {
    const subs = await findByUserId(req.user.id);
    const channelIds = subs.map((s) => s.channel_id).filter(Boolean);
    let lastPostedMap = {};
    if (channelIds.length) {
      const rows = await db('summaries')
        .whereIn('channel_id', channelIds)
        .groupBy('channel_id')
        .select('channel_id', db.raw('max(created_at) as last_posted'));
      rows.forEach((r) => { lastPostedMap[r.channel_id] = r.last_posted; });
    }
    res.json(subs.map((s) => ({ ...s, lastPosted: lastPostedMap[s.channel_id] || null })));
  } catch (err) {
    next(err);
  }
});

// POST /api/subscriptions — follow a channel
// Body: { channelId, channelName }
router.post('/', async (req, res, next) => {
  try {
    const { channelId, channelName } = req.body;
    if (!channelId) return res.status(400).json({ error: 'channelId is required.' });

    const sub = await create({
      userId: req.user.id,
      channelId,
      channelName: channelName || channelId,
    });
    res.status(201).json(sub);
  } catch (err) {
    // Duplicate subscription
    if (err.message?.includes('UNIQUE') || err.code === '23505') {
      return res.status(409).json({ error: 'Already subscribed to this channel.' });
    }
    next(err);
  }
});

// PATCH /api/subscriptions/:id — update digest or include_shorts flag
router.patch('/:id', async (req, res, next) => {
  try {
    const { digest, include_shorts } = req.body;
    if (digest !== undefined) {
      if (typeof digest !== 'boolean') return res.status(400).json({ error: 'digest must be a boolean.' });
      await setDigest({ userId: req.user.id, subscriptionId: req.params.id, digest });
    }
    if (include_shorts !== undefined) {
      if (typeof include_shorts !== 'boolean') return res.status(400).json({ error: 'include_shorts must be a boolean.' });
      await setIncludeShorts({ userId: req.user.id, subscriptionId: req.params.id, includeShorts: include_shorts });
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/subscriptions/:id — unfollow a channel
router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await remove({ userId: req.user.id, subscriptionId: req.params.id });
    if (!deleted) return res.status(404).json({ error: 'Subscription not found.' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
