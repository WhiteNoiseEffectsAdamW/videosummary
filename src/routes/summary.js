const express = require('express');
const router = express.Router();
const { extractVideoId, getTranscript } = require('../services/transcript');
const { summarize } = require('../services/summarizer');
const summaryModel = require('../models/summary');

router.get('/', async (req, res, next) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ error: 'Missing required query param: url' });
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return res.status(400).json({ error: 'Could not parse a YouTube video ID from that URL.' });
    }

    // Cache hit
    const cached = await summaryModel.findByVideoId(videoId);
    if (cached) {
      return res.json({ videoId, cached: true, ...cached.summary });
    }

    // Fetch transcript
    const { text, durationSeconds } = await getTranscript(videoId);

    // Summarize
    const summary = await summarize(text, durationSeconds);

    // Persist
    await summaryModel.create({
      videoId,
      title: summary.tldr?.slice(0, 100) ?? videoId,
      summary,
      transcriptLength: text.length,
    });

    return res.json({ videoId, cached: false, ...summary });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
