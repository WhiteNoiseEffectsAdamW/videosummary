const router = require('express').Router();
const requireAuth = require('../middleware/requireAuth');
const { findByUserId, create, remove, setDigest, setIncludeShorts, reorder } = require('../models/subscription');
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

    // Backfill avatar URLs for subscriptions that don't have one yet (fire-and-forget)
    const missing = subs.filter((s) => !s.avatar_url && s.channel_id);
    if (missing.length) {
      Promise.allSettled(missing.map(async (s) => {
        try {
          const url = `https://www.youtube.com/channel/${s.channel_id}`;
          const pageRes = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; bot)' } });
          if (!pageRes.ok) return;
          const html = await pageRes.text();
          const avatarMatch = html.match(/"avatar":\{"thumbnails":\[\{"url":"([^"]+)"/);
          if (!avatarMatch) return;
          const avatarUrl = avatarMatch[1].replace(/=s\d+-/, '=s88-');
          await db('subscriptions').where({ id: s.id }).update({ avatar_url: avatarUrl });
        } catch {}
      })).catch(() => {});
    }
  } catch (err) {
    next(err);
  }
});

// POST /api/subscriptions/reorder — update channel priority order
// Body: { orderedIds: [id, id, ...] }
router.post('/reorder', async (req, res, next) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) return res.status(400).json({ error: 'orderedIds must be an array.' });
    await reorder({ userId: req.user.id, orderedIds });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/subscriptions/check?channelId= — check if user is following a channel
router.get('/check', async (req, res, next) => {
  try {
    const { channelId } = req.query;
    if (!channelId) return res.status(400).json({ error: 'channelId is required.' });
    const { db } = require('../db');
    const row = await db('subscriptions')
      .where({ user_id: req.user.id, channel_id: channelId, active: true })
      .first();
    res.json({ following: !!row });
  } catch (err) {
    next(err);
  }
});

// POST /api/subscriptions — follow a channel
// Body: { channelId, channelName }
router.post('/', async (req, res, next) => {
  try {
    const { channelId, channelName, avatarUrl } = req.body;
    if (!channelId) return res.status(400).json({ error: 'channelId is required.' });

    // Free tier: channel limit (disabled — free for now, re-enable with Stripe)
    // const isPro = req.user.subscription_status === 'pro';
    // if (!isPro) {
    //   const count = await db('subscriptions').where({ user_id: req.user.id, active: true }).count('id as n').first();
    //   if (Number(count.n) >= 3) {
    //     return res.status(403).json({ error: 'Free plan includes 3 channels. Upgrade to Pro for unlimited.', upgradeRequired: true });
    //   }
    // }

    const sub = await create({
      userId: req.user.id,
      channelId,
      channelName: channelName || channelId,
      avatarUrl: avatarUrl || null,
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
