const router = require('express').Router();
const requireAuth = require('../middleware/requireAuth');
const { findByUserId, create, remove } = require('../models/subscription');

// All routes require login
router.use(requireAuth);

// GET /api/subscriptions — list my subscriptions
router.get('/', async (req, res, next) => {
  try {
    const subs = await findByUserId(req.user.id);
    res.json(subs);
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
