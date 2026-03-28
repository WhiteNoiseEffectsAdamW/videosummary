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
  const title = summary.title || videoId;

  const PAD = 64;
  const titleLines = wrapText(title, 28).slice(0, 2);
  const TITLE_FONT = 68;
  const TITLE_LINE_H = 80;

  // Badge
  const BADGE_W = 248;
  const BADGE_H = 74;
  const BADGE_X = W - PAD - BADGE_W;
  const BADGE_Y = 38;

  // Wordmark baseline
  const WM_Y = 110;

  // Bottom text — anchor last title line at H - 56
  const titleLastY = H - 56;
  const titleFirstY = titleLastY - (titleLines.length - 1) * TITLE_LINE_H;
  const channelY = titleFirstY - 72;

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="topfade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${NAV_BG}" stop-opacity="0.82"/>
        <stop offset="42%" stop-color="${NAV_BG}" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="botfade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="38%" stop-color="${NAV_BG}" stop-opacity="0"/>
        <stop offset="100%" stop-color="${NAV_BG}" stop-opacity="0.82"/>
      </linearGradient>
      <filter id="shadow">
        <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#000000" flood-opacity="0.75"/>
      </filter>
    </defs>

    <!-- Uniform dark base + gradient overlays -->
    <rect x="0" y="0" width="${W}" height="${H}" fill="${NAV_BG}" fill-opacity="0.52"/>
    <rect x="0" y="0" width="${W}" height="${H}" fill="url(#topfade)"/>
    <rect x="0" y="0" width="${W}" height="${H}" fill="url(#botfade)"/>

    <!-- Wordmark: Head(white)water(cyan) -->
    <text x="${PAD}" y="${WM_Y}" font-family="Inter,Arial,sans-serif" font-size="64" font-weight="800" fill="#ffffff" letter-spacing="-1" filter="url(#shadow)">Head<tspan fill="${CYAN}">water</tspan></text>

    <!-- Summary badge (filled cyan) -->
    <rect x="${BADGE_X}" y="${BADGE_Y}" width="${BADGE_W}" height="${BADGE_H}" rx="8" fill="${CYAN}"/>
    <text x="${BADGE_X + BADGE_W / 2}" y="${BADGE_Y + 49}" font-family="Inter,Arial,sans-serif" font-size="30" font-weight="700" fill="${NAV_BG}" text-anchor="middle" letter-spacing="2">SUMMARY</text>

    <!-- Channel name -->
    ${channelName ? `<text x="${PAD}" y="${channelY}" font-family="Inter,Arial,sans-serif" font-size="46" font-weight="800" fill="${CYAN}" letter-spacing="3" filter="url(#shadow)">${escXml(channelName)}</text>` : ''}

    <!-- Title -->
    ${titleLines.map((line, i) => `<text x="${PAD}" y="${titleFirstY + i * TITLE_LINE_H}" font-family="Inter,Arial,sans-serif" font-size="${TITLE_FONT}" font-weight="800" fill="#ffffff" letter-spacing="-1" filter="url(#shadow)">${escXml(line)}</text>`).join('\n    ')}
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

    // Full-bleed thumbnail at 1200x630
    const thumbResized = await sharp(thumbBuffer)
      .resize(W, H, { fit: 'cover', position: 'centre' })
      .toBuffer();

    // Render SVG overlay (gradients + text) using resvg
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

    // Composite: full thumbnail + SVG overlay
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
