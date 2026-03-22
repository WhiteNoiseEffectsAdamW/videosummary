const router = require('express').Router();
const requireAuth = require('../middleware/requireAuth');
const subscriptionModel = require('../models/subscription');
const summaryModel = require('../models/summary');
const { scanChannel } = require('../jobs/poll-channels');

function toVideoShape(row, channelMap = {}) {
  return {
    videoId: row.video_id,
    channelId: row.channel_id || null,
    channelName: channelMap[row.channel_id] || null,
    title: row.title,
    createdAt: row.created_at,
    thumbnailUrl: `https://img.youtube.com/vi/${row.video_id}/maxresdefault.jpg`,
    tldr: row.summary?.tldr || null,
    verdict: row.summary?.verdict || null,
    categories: row.summary?.categories || [],
    readTimeSaved: row.summary?.readTimeSaved || null,
  };
}

// GET /api/videos — channel summaries + user's manually summarized videos
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const subs = await subscriptionModel.findByUserId(req.user.id);
    const channelMap = Object.fromEntries(subs.map((s) => [s.channel_id, s.channel_name || s.channel_id]));

    const [channelRows, userRows] = await Promise.all([
      subs.length ? summaryModel.findByChannelIds(subs.map((s) => s.channel_id)) : [],
      summaryModel.findByUserId(req.user.id),
    ]);

    // Merge, dedupe by videoId, sort newest first
    const seen = new Set();
    const result = [...channelRows, ...userRows]
      .filter((row) => { if (seen.has(row.video_id)) return false; seen.add(row.video_id); return true; })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map((row) => toVideoShape(row, channelMap));

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/videos/scan — manually trigger a scan of all followed channels
router.post('/scan', requireAuth, async (req, res, next) => {
  try {
    const subs = await subscriptionModel.findByUserId(req.user.id);
    if (!subs.length) return res.json({ ok: true, message: 'No channels to scan.' });
    // Fire-and-forget all channels
    subs.forEach((s) => scanChannel(s.channel_id).catch(() => {}));
    res.json({ ok: true, message: `Scanning ${subs.length} channel(s)…` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
