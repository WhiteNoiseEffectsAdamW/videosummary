const router = require('express').Router();
const requireAuth = require('../middleware/requireAuth');
const subscriptionModel = require('../models/subscription');
const summaryModel = require('../models/summary');

// GET /api/videos — summaries for the user's followed channels
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const subs = await subscriptionModel.findByUserId(req.user.id);
    if (!subs.length) return res.json([]);

    const channelIds = subs.map((s) => s.channel_id);
    const rows = await summaryModel.findByChannelIds(channelIds);

    const channelMap = Object.fromEntries(subs.map((s) => [s.channel_id, s.channel_name || s.channel_id]));

    const result = rows.map((row) => ({
      videoId: row.video_id,
      channelId: row.channel_id,
      channelName: channelMap[row.channel_id] || row.channel_id,
      title: row.title,
      createdAt: row.created_at,
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

module.exports = router;
