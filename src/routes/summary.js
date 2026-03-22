const express = require('express');
const router = express.Router();
const { extractVideoId, getTranscript } = require('../services/transcript');
const { summarize } = require('../services/summarizer');
const summaryModel = require('../models/summary');

async function fetchVideoMeta(videoId) {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    if (!res.ok) return {};
    const data = await res.json();
    return { title: data.title || null, channelName: data.author_name || null };
  } catch {
    return {};
  }
}

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
      return res.json({ videoId, cached: true, thumbnailUrl, channelName: cached.channel_name, ...cached.summary });
    }

    const [{ text, durationSeconds }, meta] = await Promise.all([
      getTranscript(videoId),
      fetchVideoMeta(videoId),
    ]);
    const summary = await summarize(text, durationSeconds, meta.title);

    await summaryModel.create({
      videoId,
      title: meta.title || summary.tldr?.slice(0, 100) || videoId,
      channelName: meta.channelName || null,
      summary,
      transcriptLength: text.length,
    });

    summaryModel.upsertUserSave(userId, videoId).catch(() => {});

    return res.json({ videoId, cached: false, thumbnailUrl, channelName: meta.channelName || null, ...summary });
  } catch (err) {
    next(err);
  }
});

// GET /api/summary/:videoId — fetch a single cached summary by video ID (public)
router.get('/:videoId', async (req, res, next) => {
  try {
    const { videoId } = req.params;
    const cached = await summaryModel.findByVideoId(videoId);
    if (!cached) return res.status(404).json({ error: 'Summary not found.' });
    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    res.json({ videoId, cached: true, thumbnailUrl, title: cached.title, channelName: cached.channel_name, ...cached.summary });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
