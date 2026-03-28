const express = require('express');
const path = require('path');
const fs = require('fs');
const { findByVideoId } = require('../models/summary');

const router = express.Router();

const cache = new Map();
const MAX_CACHE = 500;

const W = 1200;
const H = 630;
const THUMB_W = 420;
const NAV_BG = '#0c0f14';
const CYAN = '#22d3ee';

// Load font files once at startup
const FONT_700 = fs.readFileSync(path.join(__dirname, '../fonts/inter-700.woff'));
const FONT_900 = fs.readFileSync(path.join(__dirname, '../fonts/inter-900.woff'));

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
  const tldr = summary.summary?.tldr || '';
  const durationSeconds = summary.duration_seconds;
  const savesMins = durationSeconds > 0 ? Math.round(durationSeconds / 60) : null;

  const textX = THUMB_W + 48;
  const titleLines = wrapText(title, 28).slice(0, 3);
  const tldrLines = wrapText(tldr, 42).slice(0, 3);

  const titleY = 160;
  const titleLineH = 52;
  const tldrLabelY = titleY + titleLines.length * titleLineH + 30;
  const tldrY = tldrLabelY + 30;
  const tldrLineH = 34;

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <style>
        @font-face {
          font-family: 'Inter';
          font-weight: 700;
          src: url('data:font/woff;base64,${FONT_700.toString('base64')}') format('woff');
        }
        @font-face {
          font-family: 'Inter';
          font-weight: 900;
          src: url('data:font/woff;base64,${FONT_900.toString('base64')}') format('woff');
        }
      </style>
      <linearGradient id="fade" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="${NAV_BG}" stop-opacity="0"/>
        <stop offset="100%" stop-color="${NAV_BG}" stop-opacity="1"/>
      </linearGradient>
    </defs>

    <!-- Dark right panel -->
    <rect x="${THUMB_W}" y="0" width="${W - THUMB_W}" height="${H}" fill="${NAV_BG}"/>
    <!-- Gradient edge blend -->
    <rect x="${THUMB_W - 60}" y="0" width="60" height="${H}" fill="url(#fade)"/>
    <!-- Cyan top bar -->
    <rect x="0" y="0" width="${W}" height="4" fill="${CYAN}"/>

    <!-- Wordmark -->
    <text x="${textX}" y="70" font-family="Inter,Arial,sans-serif" font-size="22" font-weight="700" fill="#ffffff" letter-spacing="2">HEADWATER</text>

    <!-- Summary pill -->
    <rect x="${W - 170}" y="44" width="110" height="32" rx="6" fill="${CYAN}"/>
    <text x="${W - 115}" y="65" font-family="Inter,Arial,sans-serif" font-size="14" font-weight="700" fill="${NAV_BG}" text-anchor="middle" letter-spacing="1">SUMMARY</text>

    <!-- Channel name -->
    ${channelName ? `<text x="${textX}" y="120" font-family="Inter,Arial,sans-serif" font-size="18" font-weight="700" fill="${CYAN}" letter-spacing="2">${escXml(channelName)}</text>` : ''}

    <!-- Title -->
    ${titleLines.map((line, i) => `<text x="${textX}" y="${titleY + i * titleLineH}" font-family="Inter,Arial,sans-serif" font-size="40" font-weight="900" fill="#ffffff" letter-spacing="-0.5">${escXml(line)}</text>`).join('\n    ')}

    <!-- TL;DR label -->
    <text x="${textX}" y="${tldrLabelY}" font-family="Inter,Arial,sans-serif" font-size="14" font-weight="700" fill="${CYAN}" letter-spacing="2">TL;DR</text>

    <!-- TL;DR text -->
    ${tldrLines.map((line, i) => `<text x="${textX}" y="${tldrY + i * tldrLineH}" font-family="Inter,Arial,sans-serif" font-size="22" font-weight="700" fill="#64748b">${escXml(line)}</text>`).join('\n    ')}

    <!-- Saves X min -->
    ${savesMins ? `<text x="${W - 48}" y="${H - 36}" font-family="Inter,Arial,sans-serif" font-size="18" font-weight="700" fill="#334155" text-anchor="end">Saves ${savesMins} min</text>` : ''}
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

    const thumbResized = await sharp(thumbBuffer)
      .resize(THUMB_W, H, { fit: 'cover', position: 'centre' })
      .toBuffer();

    // Render SVG to PNG using resvg (proper font support)
    const svg = buildSvg(summary, videoId);
    const resvg = new Resvg(svg, {
      font: {
        loadSystemFonts: false,
        fontBuffers: [FONT_700, FONT_900],
      },
    });
    const overlayPng = resvg.render().asPng();

    // Composite: thumbnail base + SVG overlay
    const png = await sharp(thumbResized)
      .extend({ right: W - THUMB_W, background: { r: 12, g: 15, b: 20 } })
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
