const express = require('express');
const path = require('path');
const fs = require('fs');
const { findByVideoId } = require('../models/summary');

const router = express.Router();

const cache = new Map();
const MAX_CACHE = 500;

const W = 1200;
const H = 630;
const NAV_BG = '#0a0a0a';
const AMBER = '#c4a35a';

// Load font files once at startup
const FONT = fs.readFileSync(path.join(__dirname, '../fonts/inter.ttf'));
console.log('[og] font loaded — inter.ttf:', FONT.length);

function escXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wrapText(text, maxChars) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    if ((line + ' ' + word).trim().length > maxChars) {
      if (line) lines.push(line.trim());
      line = word;
    } else {
      line = (line + ' ' + word).trim();
    }
  }
  if (line) lines.push(line.trim());
  return lines;
}

function buildSvg(summary, videoId) {
  const channelName = (summary.channel_name || '').replace(/^@/, '').toUpperCase();

  // Parse summary JSON to get quote
  let summaryData = {};
  try {
    summaryData = typeof summary.summary === 'string'
      ? JSON.parse(summary.summary)
      : (summary.summary || {});
  } catch {}
  // Sizes — must be large enough to read at iMessage scale (~23% of 1200x630)
  const STRIPE = 16;
  const PAD_LEFT = 60;
  const PAD_RIGHT = 60;
  const LABEL_FONT = 44;
  const QUOTE_FONT = 58;
  const QUOTE_LINE_H = 76;
  const BOTTOM_FONT = 32;
  const MAX_QUOTE_LINES = 3;
  const MAX_CHARS = 32; // chars per line at this font size

  const quotes = summaryData.quotes || [];
  const fits = (t) => wrapText(`\u201c${t}`, MAX_CHARS).length <= MAX_QUOTE_LINES;

  // 1. Try the first (best) quote as-is
  // 2. If it won't fit but has an em dash, the portion before the dash counts as a full quote
  // 3. Fall back to the shortest quote that fits (no minimum length)
  // 4. Last resort: shortest quote overall (will be truncated with ellipsis)
  let displayQuote = null;
  const firstQuote = quotes[0]?.text || '';
  if (firstQuote && fits(firstQuote)) {
    displayQuote = firstQuote;
  } else if (firstQuote && firstQuote.includes('\u2014')) {
    const beforeDash = firstQuote.split('\u2014')[0].trim();
    if (fits(beforeDash)) displayQuote = beforeDash;
  }
  if (!displayQuote) {
    displayQuote = quotes
      .map(q => q.text || '')
      .filter(t => t.length > 0 && fits(t))
      .sort((a, b) => a.length - b.length)[0];
  }
  if (!displayQuote) {
    displayQuote = quotes
      .map(q => q.text || '')
      .filter(t => t.length > 0)
      .sort((a, b) => a.length - b.length)[0]
      || summaryData.tldr || summary.title || videoId;
  }

  const allQuoteLines = wrapText(`\u201c${displayQuote}`, MAX_CHARS);
  const quoteLines = allQuoteLines.slice(0, MAX_QUOTE_LINES);
  // If quote was clipped, close with ellipsis on last line
  if (allQuoteLines.length > MAX_QUOTE_LINES) {
    quoteLines[MAX_QUOTE_LINES - 1] = quoteLines[MAX_QUOTE_LINES - 1].replace(/\s+\S+$/, '') + '\u2026\u201d';
  } else {
    quoteLines[quoteLines.length - 1] += '\u201d';
  }

  // Center block vertically
  const totalQuoteH = (quoteLines.length - 1) * QUOTE_LINE_H + QUOTE_FONT;
  const GAP_LABEL_QUOTE = 36;
  const GAP_QUOTE_BOTTOM = 40;
  const blockH = LABEL_FONT + GAP_LABEL_QUOTE + totalQuoteH + GAP_QUOTE_BOTTOM + BOTTOM_FONT;
  const blockTop = Math.round((H - blockH) / 2);

  const labelY = blockTop + LABEL_FONT;
  const quoteStartY = labelY + GAP_LABEL_QUOTE + QUOTE_FONT;
  const bottomY = quoteStartY + (quoteLines.length - 1) * QUOTE_LINE_H + GAP_QUOTE_BOTTOM + BOTTOM_FONT;

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="shadow">
        <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#000000" flood-opacity="0.6"/>
      </filter>
      <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="${AMBER}" stop-opacity="1"/>
        <stop offset="100%" stop-color="${AMBER}" stop-opacity="0.25"/>
      </linearGradient>
    </defs>

    <!-- Dark navy overlay — reduces thumbnail to ~12% -->
    <rect x="0" y="0" width="${W}" height="${H}" fill="${NAV_BG}" fill-opacity="0.88"/>

    <!-- Amber top bar (flush to edge, gradient left→right) -->
    <rect x="0" y="0" width="${W}" height="${STRIPE}" fill="url(#barGrad)"/>

    <!-- Channel name label -->
    ${channelName ? `<text x="${PAD_LEFT}" y="${labelY}" font-family="Inter,Arial,sans-serif" font-size="${LABEL_FONT}" font-weight="800" fill="${AMBER}" letter-spacing="4">${escXml(channelName)}</text>` : ''}

    <!-- Pull quote -->
    ${quoteLines.map((line, i) => `<text x="${PAD_LEFT}" y="${quoteStartY + i * QUOTE_LINE_H}" font-family="Inter,Arial,sans-serif" font-size="${QUOTE_FONT}" font-weight="400" fill="#f5f0e8" font-style="italic" filter="url(#shadow)">${escXml(line)}</text>`).join('\n    ')}

    <!-- Headwater Summary label -->
    <text x="${PAD_LEFT}" y="${bottomY}" font-family="Inter,Arial,sans-serif" font-size="${BOTTOM_FONT}" font-weight="600" fill="#7a7060" letter-spacing="4">HEADWATER SUMMARY</text>
  </svg>`;
}

router.get('/:videoId', async (req, res) => {
  const { videoId } = req.params;

  if (cache.has(videoId)) {
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=86400');
    return res.send(cache.get(videoId));
  }

  let sharp, Resvg;
  try { sharp = require('sharp'); } catch (e) { /* not available */ }
  try { ({ Resvg } = require('@resvg/resvg-js')); } catch (e) { /* not available */ }

  if (!sharp || !Resvg) {
    return res.redirect(`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`);
  }

  try {
    const summary = await findByVideoId(videoId);
    if (!summary) return res.status(404).send('Not found');

    const thumbUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    const thumbRes = await fetch(thumbUrl);
    if (!thumbRes.ok) throw new Error('Thumbnail fetch failed');
    const thumbBuffer = Buffer.from(await thumbRes.arrayBuffer());

    // Full-bleed thumbnail at 1200x630 (will be knocked back to ~12% by SVG overlay)
    const thumbResized = await sharp(thumbBuffer)
      .resize(W, H, { fit: 'cover', position: 'centre' })
      .toBuffer();

    // Render SVG overlay (dark bg + stripe + text) using resvg
    const svg = buildSvg(summary, videoId);
    const resvg = new Resvg(svg, {
      font: {
        loadSystemFonts: false,
        fontDirs: [path.join(__dirname, '../fonts')],
      },
    });
    const rendered = resvg.render();
    const overlayPng = rendered.asPng();
    console.log('[og] resvg rendered', videoId, '— png size:', overlayPng.length, 'w:', rendered.width, 'h:', rendered.height);

    // Composite: thumbnail (ghost texture) + SVG overlay
    const png = await sharp(thumbResized)
      .composite([{ input: Buffer.from(overlayPng), top: 0, left: 0 }])
      .png()
      .toBuffer();

    if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value);
    cache.set(videoId, png);

    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(png);
  } catch (err) {
    console.error('[og] failed for', videoId, err.message);
    res.redirect(`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`);
  }
});

// Thumbnail proxy — serves YouTube thumbnails from headwater.app domain
// Improves email deliverability (images align with sending domain)
router.get('/thumb/:videoId', async (req, res) => {
  const { videoId } = req.params;
  if (!/^[\w-]{5,20}$/.test(videoId)) return res.status(400).end();

  const urls = [
    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
  ];

  for (const url of urls) {
    try {
      const upstream = await fetch(url);
      if (!upstream.ok) continue;
      const buf = Buffer.from(await upstream.arrayBuffer());
      // hqdefault returns a 120x90 placeholder for videos with no thumbnail — detect by size
      if (buf.length < 2000) continue;
      res.set('Content-Type', 'image/jpeg');
      res.set('Cache-Control', 'public, max-age=86400');
      return res.send(buf);
    } catch {
      continue;
    }
  }
  res.status(404).end();
});

module.exports = router;
