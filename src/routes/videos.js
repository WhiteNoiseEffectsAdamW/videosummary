const router = require('express').Router();
const requireAuth = require('../middleware/requireAuth');
const subscriptionModel = require('../models/subscription');
const summaryModel = require('../models/summary');
const { scanChannel } = require('../jobs/poll-channels');
const { sendDigest } = require('../services/email');

// GET /api/videos — user's saved videos (manual + channel)
router.get('/', requireAuth, async (req, res, next) => {
  try {
    // History limit disabled — all users get full history while free tier is open
    // const isPro = req.user.subscription_status === 'pro';
    // const historyLimit = isPro ? null : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [subs, savedRows] = await Promise.all([
      subscriptionModel.findByUserId(req.user.id),
      summaryModel.findSavedByUserId(req.user.id, 500),
    ]);

    const channelMap = Object.fromEntries(subs.map((s) => [s.channel_id, s.channel_name || s.channel_id]));

    const result = savedRows.map((row) => ({
      videoId: row.video_id,
      slug: row.slug || null,
      channelId: row.channel_id || null,
      channelName: row.channel_name || (row.channel_id ? (channelMap[row.channel_id] || null) : null),
      title: row.title,
      savedAt: row.saved_at || row.created_at,
      publishedAt: row.published_at || null,
      thumbnailUrl: `https://img.youtube.com/vi/${row.video_id}/maxresdefault.jpg`,
      tldr: row.summary?.tldr || null,
      verdict: row.summary?.verdict || null,
      categories: row.summary?.categories || [],
      readTimeSaved: row.summary?.readTimeSaved || null,
      durationSeconds: row.duration_seconds || null,
      viewed: !!row.viewed_at,
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/videos/:videoId/viewed — mark a video as viewed
router.post('/:videoId/viewed', requireAuth, async (req, res, next) => {
  try {
    await summaryModel.markViewed(req.user.id, req.params.videoId);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/videos/:videoId — remove from My Videos
router.delete('/:videoId', requireAuth, async (req, res, next) => {
  try {
    await summaryModel.dismissUserSave(req.user.id, req.params.videoId);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/videos/send-test-digest — send a sample digest to the logged-in user
router.post('/send-test-digest', requireAuth, async (req, res, next) => {
  try {
    if (!process.env.RESEND_API_KEY) {
      return res.status(503).json({ error: 'Email is not configured yet.' });
    }
    const rows = await summaryModel.findSavedByUserId(req.user.id, 10);
    if (!rows.length) {
      return res.status(400).json({ error: 'No videos in your list to send.' });
    }
    await sendDigest(req.user.email, rows);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/videos/scan — manually trigger scan of followed channels
// Optional body: { channelId } to scan a single channel
router.post('/scan', requireAuth, async (req, res, next) => {
  try {
    const subs = await subscriptionModel.findByUserId(req.user.id);
    if (!subs.length) return res.json({ ok: true });
    const { channelId } = req.body || {};
    const toScan = channelId ? subs.filter((s) => s.channel_id === channelId) : subs;
    const counts = await Promise.all(toScan.map((s) => scanChannel(s.channel_id, s.channel_name, 3 * 24 * 60 * 60 * 1000, req.user.id).catch(() => 0)));
    const found = counts.reduce((a, b) => a + b, 0);
    res.json({ ok: true, found });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
