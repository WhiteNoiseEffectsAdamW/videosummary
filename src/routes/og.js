const express = require('express');
const path = require('path');
const fs = require('fs');
const { findByVideoId } = require('../models/summary');

const router = express.Router();

const cache = new Map();
const MAX_CACHE = 500;

const W = 1200;
const H = 630;
const NAV_BG = '#0c0f14';
const CYAN = '#22d3ee';

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
  const rawQuote = summaryData.quotes?.[0]?.text || summaryData.tldr || summary.title || videoId;

  const STRIPE = 5;
  const PAD_LEFT = 85;
  const LABEL_FONT = 28;
  const QUOTE_FONT = 52;
  const QUOTE_LINE_H = 68;
  const MAX_QUOTE_LINES = 4;

  const quoteLines = wrapText(`\u201c${rawQuote}\u201d`, 42).slice(0, MAX_QUOTE_LINES);

  // Vertical layout — center the block
  const totalQuoteH = (quoteLines.length - 1) * QUOTE_LINE_H + QUOTE_FONT;
  const blockH = LABEL_FONT + 28 + totalQuoteH + 32 + LABEL_FONT;
  const blockTop = Math.round((H - blockH) / 2);

  const topLabelY = blockTop + LABEL_FONT;
  const quoteStartY = topLabelY + 28 + QUOTE_FONT;
  const bottomLabelY = quoteStartY + (quoteLines.length - 1) * QUOTE_LINE_H + 32 + LABEL_FONT;

  const topLabel = channelName ? `KEY INSIGHT  \u00B7  ${channelName}` : 'KEY INSIGHT';

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="shadow">
        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="0.55"/>
      </filter>
    </defs>

    <!-- Dark navy overlay — reduces thumbnail to ~12% -->
    <rect x="0" y="0" width="${W}" height="${H}" fill="${NAV_BG}" fill-opacity="0.88"/>

    <!-- Cyan left stripe (5px, flush to edge) -->
    <rect x="0" y="0" width="${STRIPE}" height="${H}" fill="${CYAN}"/>

    <!-- Top label: KEY INSIGHT · CHANNEL -->
    <text x="${PAD_LEFT}" y="${topLabelY}" font-family="Inter,Arial,sans-serif" font-size="${LABEL_FONT}" font-weight="700" fill="${CYAN}" letter-spacing="3">${escXml(topLabel)}</text>

    <!-- Pull quote -->
    ${quoteLines.map((line, i) => `<text x="${PAD_LEFT}" y="${quoteStartY + i * QUOTE_LINE_H}" font-family="Inter,Arial,sans-serif" font-size="${QUOTE_FONT}" font-weight="400" fill="#e2e8f0" font-style="italic" filter="url(#shadow)">${escXml(line)}</text>`).join('\n    ')}

    <!-- Bottom label: HEADWATER SUMMARY -->
    <text x="${PAD_LEFT}" y="${bottomLabelY}" font-family="Inter,Arial,sans-serif" font-size="${LABEL_FONT}" font-weight="600" fill="#475569" letter-spacing="3">HEADWATER SUMMARY</text>
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

module.exports = router;
