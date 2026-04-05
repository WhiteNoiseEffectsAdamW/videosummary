#!/usr/bin/env node
// Generates client/public/og-image-light.png (L2) and og-image-dark.png (D2)
'use strict';

const path = require('path');
const fs = require('fs');

const W = 1200;
const H = 630;
const AMBER = '#c4a35a';

// ── L2: Cream gradient, left stripe, Garamond wordmark ──────────────
function buildL2() {
  const STRIPE_X = 60;
  const STRIPE_H = 470;
  const STRIPE_Y = Math.round((H - STRIPE_H) / 2);

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0.2" y1="0" x2="0.8" y2="1">
      <stop offset="0%" stop-color="#fdf8ef"/>
      <stop offset="100%" stop-color="#f5ede0"/>
    </linearGradient>
    <filter id="noise" x="0%" y="0%" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
    </filter>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" filter="url(#noise)" opacity="0.04"/>

  <!-- Left amber stripe -->
  <rect x="${STRIPE_X}" y="${STRIPE_Y}" width="4" height="${STRIPE_H}" fill="${AMBER}" opacity="0.5"/>

  <!-- Wordmark — EB Garamond 148/500 -->
  <text x="84" y="318" font-family="EB Garamond,Georgia,serif" font-size="148" font-weight="500" fill="#1a1612">Headwater</text>

  <!-- Tagline — Inter 38/500 uppercase -->
  <text x="86" y="388" font-family="Inter,Arial,sans-serif" font-size="38" font-weight="500" fill="${AMBER}" letter-spacing="3">UPSTREAM OF THE ALGORITHM.</text>
</svg>`;
}

// ── D2: Dark, amber top bar, Garamond wordmark ──────────────────────
function buildD2() {
  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${AMBER}" stop-opacity="1"/>
      <stop offset="100%" stop-color="${AMBER}" stop-opacity="0.15"/>
    </linearGradient>
    <filter id="noise" x="0%" y="0%" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
    </filter>
  </defs>

  <rect width="${W}" height="${H}" fill="#0a0a0a"/>
  <rect width="${W}" height="${H}" filter="url(#noise)" opacity="0.055"/>

  <!-- Amber top bar -->
  <rect width="${W}" height="16" fill="url(#bar)"/>

  <!-- Wordmark — EB Garamond 156/500 -->
  <text x="56" y="330" font-family="EB Garamond,Georgia,serif" font-size="156" font-weight="500" fill="#f5f0e8">Headwater</text>

  <!-- Tagline — Inter 42/500 uppercase -->
  <text x="66" y="404" font-family="Inter,Arial,sans-serif" font-size="42" font-weight="500" fill="${AMBER}" letter-spacing="2">UPSTREAM OF THE ALGORITHM.</text>
</svg>`;
}

async function generate(name, svgStr) {
  const { Resvg } = require('@resvg/resvg-js');
  const resvg = new Resvg(svgStr, {
    font: {
      loadSystemFonts: false,
      fontDirs: [path.join(__dirname, '../src/fonts')],
    },
  });
  const rendered = resvg.render();
  const png = rendered.asPng();
  const outPath = path.join(__dirname, '../client/public', name);
  fs.writeFileSync(outPath, png);
  console.log(`Written: ${name} (${png.length} bytes)`);
}

async function main() {
  try { require('@resvg/resvg-js'); } catch {
    console.error('Missing @resvg/resvg-js — run: npm install @resvg/resvg-js');
    process.exit(1);
  }
  await generate('og-image-light.png', buildL2());
  await generate('og-image-dark.png', buildD2());
}

main().catch((e) => { console.error(e); process.exit(1); });