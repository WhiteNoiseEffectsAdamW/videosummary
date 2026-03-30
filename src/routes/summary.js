const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { extractVideoId, getTranscript } = require('../services/transcript');
const { summarize } = require('../services/summarizer');
const summaryModel = require('../models/summary');
const { db } = require('../db');

const DAILY_USER_CAP = parseInt(process.env.DAILY_USER_CAP || '20', 10);

async function getUserSummariesToday(userId) {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const row = await db('user_saves')
    .where({ user_id: userId })
    .where('created_at', '>=', since)
    .count('id as n')
    .first();
  return Number(row.n);
}

// 3 free summaries per IP per day for unauthenticated users
const anonLimit = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 3,
  skip: (req) => !!req.user,
  handler: (req, res) => res.status(429).json({ error: 'Free limit reached. Sign up to summarize more videos.', limitReached: true }),
  standardHeaders: true,
  legacyHeaders: false,
});

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

router.get('/', anonLimit, async (req, res, next) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Missing required query param: url' });

    const videoId = extractVideoId(url);
    if (!videoId) return res.status(400).json({ error: 'Could not parse a YouTube video ID from that URL.' });

    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    const userId = req.user?.id || null;

    // Per-user daily cap for authenticated users
    if (userId) {
      const count = await getUserSummariesToday(userId);
      if (count >= DAILY_USER_CAP) {
        return res.status(429).json({ error: `Daily limit of ${DAILY_USER_CAP} summaries reached. Try again tomorrow.`, limitReached: true });
      }
    }

    // Cache hit — still save to user's list
    const cached = await summaryModel.findByVideoId(videoId);
    if (cached) {
      summaryModel.upsertUserSave(userId, videoId).catch(() => {});
      return res.json({ videoId, cached: true, thumbnailUrl, title: cached.title, channelName: cached.channel_name, channelId: cached.channel_id || null, durationSeconds: cached.duration_seconds || null, ...cached.summary });
    }

    const [{ text, durationSeconds, isSampled }, meta] = await Promise.all([
      getTranscript(videoId),
      fetchVideoMeta(videoId),
    ]);
    const { summary, inputTokens, outputTokens } = await summarize(text, durationSeconds, meta.title, isSampled);

    await summaryModel.create({
      videoId,
      title: meta.title || summary.tldr?.slice(0, 100) || videoId,
      channelName: meta.channelName || null,
      summary,
      transcriptLength: text.length,
      durationSeconds,
      inputTokens,
      outputTokens,
    });

    summaryModel.upsertUserSave(userId, videoId).catch(() => {});

    return res.json({ videoId, cached: false, thumbnailUrl, title: meta.title || summary.tldr?.slice(0, 100) || videoId, channelName: meta.channelName || null, durationSeconds, ...summary });
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
    res.json({ videoId, cached: true, thumbnailUrl, title: cached.title, channelName: cached.channel_name, channelId: cached.channel_id || null, durationSeconds: cached.duration_seconds || null, ...cached.summary });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
