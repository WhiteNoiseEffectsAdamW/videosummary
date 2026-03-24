const router = require('express').Router();
const requireAuth = require('../middleware/requireAuth');

async function resolveChannelUrl(url) {
  if (!url) throw new Error('url is required.');

  // Already a raw channel ID
  if (/^UC[\w-]{22}$/.test(url.trim())) {
    return { channelId: url.trim(), channelName: null };
  }

  // Extract from youtube.com/channel/UCxxxxx
  const directMatch = url.match(/youtube\.com\/channel\/(UC[\w-]{22})/);
  if (directMatch) {
    return { channelId: directMatch[1], channelName: null };
  }

  // For @handle or /c/ or /user/ URLs — fetch the page and extract channelId
  const pageRes = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; bot)' },
  });
  if (!pageRes.ok) throw new Error('Could not fetch that YouTube page.');

  const html = await pageRes.text();
  const match = html.match(/"externalId":"(UC[\w-]{22})"/);
  if (!match) throw new Error('Could not find a channel ID on that page. Try using the channel URL from the About tab.');

  const nameMatch = html.match(/"canonicalBaseUrl":"\/@([^"]+)"/);
  const channelName = nameMatch ? nameMatch[1] : null;
  return { channelId: match[1], channelName };
}

// GET /api/channels/resolve?url= — resolve any YouTube channel URL to a channel ID
// GET /api/channels/resolve?videoId= — resolve channel from a video ID (via oEmbed)
router.get('/resolve', requireAuth, async (req, res, next) => {
  try {
    const { url, videoId } = req.query;

    if (videoId) {
      const oEmbed = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
      );
      if (!oEmbed.ok) return res.status(400).json({ error: 'Could not fetch video info.' });
      const data = await oEmbed.json();
      if (!data.author_url) return res.status(400).json({ error: 'No channel URL found for that video.' });
      const result = await resolveChannelUrl(data.author_url).catch(() => null);
      if (!result) return res.status(400).json({ error: 'Could not resolve channel from video.' });
      return res.json({ channelId: result.channelId, channelName: result.channelName || data.author_name || null });
    }

    if (!url) return res.status(400).json({ error: 'url or videoId is required.' });

    const result = await resolveChannelUrl(url);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
