const router = require('express').Router();
const requireAuth = require('../middleware/requireAuth');

// GET /api/channels/resolve?url= — resolve any YouTube channel URL to a channel ID
router.get('/resolve', requireAuth, async (req, res, next) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'url is required.' });

    // Already a raw channel ID
    if (/^UC[\w-]{22}$/.test(url.trim())) {
      return res.json({ channelId: url.trim(), channelName: null });
    }

    // Extract from youtube.com/channel/UCxxxxx
    const directMatch = url.match(/youtube\.com\/channel\/(UC[\w-]{22})/);
    if (directMatch) {
      return res.json({ channelId: directMatch[1], channelName: null });
    }

    // For @handle or /c/ or /user/ URLs — fetch the page and extract channelId
    const pageRes = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; bot)' },
    });
    if (!pageRes.ok) return res.status(400).json({ error: 'Could not fetch that YouTube page.' });

    const html = await pageRes.text();

    // YouTube embeds the channel ID in the page source
    const match = html.match(/"externalId":"(UC[\w-]{22})"/);
    if (!match) return res.status(400).json({ error: 'Could not find a channel ID on that page. Try using the channel URL from the About tab.' });

    // Also try to grab the channel name
    const nameMatch = html.match(/"canonicalBaseUrl":"\/@([^"]+)"/);
    const channelName = nameMatch ? `@${nameMatch[1]}` : null;

    res.json({ channelId: match[1], channelName });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
