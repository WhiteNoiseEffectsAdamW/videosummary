const router = require('express').Router();
const requireAuth = require('../middleware/requireAuth');
const subscriptionModel = require('../models/subscription');
const summaryModel = require('../models/summary');
const { scanChannel } = require('../jobs/poll-channels');

// GET /api/videos — user's saved videos (manual + channel)
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const [subs, savedRows] = await Promise.all([
      subscriptionModel.findByUserId(req.user.id),
      summaryModel.findSavedByUserId(req.user.id),
    ]);

    const channelMap = Object.fromEntries(subs.map((s) => [s.channel_id, s.channel_name || s.channel_id]));

    const result = savedRows.map((row) => ({
      videoId: row.video_id,
      channelId: row.channel_id || null,
      channelName: row.channel_name || (row.channel_id ? (channelMap[row.channel_id] || null) : null),
      title: row.title,
      savedAt: row.saved_at || row.created_at,
      thumbnailUrl: `https://img.youtube.com/vi/${row.video_id}/maxresdefault.jpg`,
      tldr: row.summary?.tldr || null,
      verdict: row.summary?.verdict || null,
      categories: row.summary?.categories || [],
      readTimeSaved: row.summary?.readTimeSaved || null,
    }));

    res.json(result);
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

// POST /api/videos/scan — manually trigger scan of all followed channels
router.post('/scan', requireAuth, async (req, res, next) => {
  try {
    const subs = await subscriptionModel.findByUserId(req.user.id);
    if (!subs.length) return res.json({ ok: true, message: 'No channels to scan.' });
    subs.forEach((s) => scanChannel(s.channel_id).catch(() => {}));
    res.json({ ok: true, message: `Scanning ${subs.length} channel(s)…` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
