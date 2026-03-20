// Downloads the yt-dlp binary to ./bin/yt-dlp on Linux (Railway).
// Skipped on other platforms since they install it separately.
const https = require('https');
const fs = require('fs');
const path = require('path');

if (process.platform !== 'linux') {
  console.log('[install-yt-dlp] skipping (not Linux)');
  process.exit(0);
}

const binDir = path.join(__dirname, '../bin');
const binPath = path.join(binDir, 'yt-dlp');

if (!fs.existsSync(binDir)) fs.mkdirSync(binDir);

if (fs.existsSync(binPath)) {
  console.log('[install-yt-dlp] already installed, skipping');
  process.exit(0);
}

const url = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';
console.log('[install-yt-dlp] downloading from', url);

function download(url, dest, redirects = 0) {
  if (redirects > 5) throw new Error('Too many redirects');
  https.get(url, (res) => {
    if (res.statusCode === 301 || res.statusCode === 302) {
      return download(res.headers.location, dest, redirects + 1);
    }
    if (res.statusCode !== 200) {
      console.error('[install-yt-dlp] HTTP', res.statusCode);
      process.exit(1);
    }
    const file = fs.createWriteStream(dest);
    res.pipe(file);
    file.on('finish', () => {
      file.close();
      fs.chmodSync(dest, '755');
      console.log('[install-yt-dlp] installed to', dest);
    });
  }).on('error', (err) => {
    console.error('[install-yt-dlp] error:', err.message);
    process.exit(1);
  });
}

download(url, binPath);
