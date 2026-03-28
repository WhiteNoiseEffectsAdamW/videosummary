// Installs fonts on Railway Linux so resvg can use system fonts.
// Skipped on non-Linux platforms.
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

if (process.platform !== 'linux') {
  console.log('[install-fonts] skipping (not Linux)');
  process.exit(0);
}

try {
  console.log('[install-fonts] installing ttf-liberation via apk...');
  execSync('apk add --no-cache ttf-liberation 2>&1 || apt-get install -y -q fonts-liberation 2>&1 || true', { stdio: 'inherit' });
  console.log('[install-fonts] done');
} catch (e) {
  console.warn('[install-fonts] failed:', e.message);
}
