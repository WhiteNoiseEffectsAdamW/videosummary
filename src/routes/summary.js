const express = require('express');
const router = express.Router();
const { extractVideoId, getTranscript } = require('../services/transcript');
const { summarize } = require('../services/summarizer');
const summaryModel = require('../models/summary');

router.get('/', async (req, res, next) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Missing required query param: url' });

    const videoId = extractVideoId(url);
    if (!videoId) return res.status(400).json({ error: 'Could not parse a YouTube video ID from that URL.' });

    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    const userId = req.user?.id || null;

    // Cache hit — still save to user's list
    const cached = await summaryModel.findByVideoId(videoId);
    if (cached) {
      summaryModel.upsertUserSave(userId, videoId).catch(() => {});
      return res.json({ videoId, cached: true, thumbnailUrl, ...cached.summary });
    }

    const { text, durationSeconds } = await getTranscript(videoId);
    const summary = await summarize(text, durationSeconds);

    await summaryModel.create({
      videoId,
      title: summary.tldr?.slice(0, 100) ?? videoId,
      summary,
      transcriptLength: text.length,
    });

    summaryModel.upsertUserSave(userId, videoId).catch(() => {});

    return res.json({ videoId, cached: false, thumbnailUrl, ...summary });
  } catch (err) {
    next(err);
  }
});

// GET /api/summary/:videoId — fetch a single cached summary by video ID
router.get('/:videoId', async (req, res, next) => {
  try {
    const { videoId } = req.params;
    const cached = await summaryModel.findByVideoId(videoId);
    if (!cached) return res.status(404).json({ error: 'Summary not found.' });
    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    res.json({ videoId, cached: true, thumbnailUrl, ...cached.summary });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
