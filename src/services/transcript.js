const { execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs/promises');
const path = require('path');
const os = require('os');

const execFileAsync = promisify(execFile);

// Extracts YouTube video ID from common URL formats.
function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Converts offset (ms) to M:SS or H:MM:SS string.
function formatTimestamp(offsetMs) {
  const totalSeconds = Math.floor(offsetMs / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}

// Flattens transcript segments into a single string with inline timestamps every ~60s.
function buildTranscriptText(segments) {
  let text = '';
  let lastStampAt = -60000;
  for (const seg of segments) {
    if (seg.offset - lastStampAt >= 60000) {
      text += ` [${formatTimestamp(seg.offset)}] `;
      lastStampAt = seg.offset;
    }
    text += seg.text + ' ';
  }
  return text.trim();
}

// Parses yt-dlp's json3 subtitle format into {text, offset, duration} segments.
function parseJson3(json3) {
  const segments = [];
  for (const event of json3.events || []) {
    if (!event.segs) continue;
    const text = event.segs
      .map((s) => s.utf8 || '')
      .join('')
      .replace(/\n/g, ' ')
      .trim();
    if (!text) continue;
    segments.push({ text, offset: event.tStartMs || 0, duration: event.dDurationMs || 0 });
  }
  return segments;
}

async function getTranscript(videoId) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'yt-'));
  const outputTemplate = path.join(tmpDir, videoId);

  try {
    const ytDlp = process.env.YT_DLP_PATH || 'yt-dlp';
    console.log('[yt-dlp] using binary:', ytDlp);
    await execFileAsync(
      ytDlp,
      [
        '--write-auto-sub',
        '--skip-download',
        '--sub-format', 'json3',
        '--sub-langs', 'en',
        '--no-warnings',
        '--output', outputTemplate,
        `https://www.youtube.com/watch?v=${videoId}`,
      ],
      { timeout: 30000 }
    );

    const files = await fs.readdir(tmpDir);
    const subFile = files.find((f) => f.endsWith('.json3'));

    if (!subFile) {
      throw new Error('No transcript available for this video. The creator may have disabled captions.');
    }

    const raw = await fs.readFile(path.join(tmpDir, subFile), 'utf8');
    const segments = parseJson3(JSON.parse(raw));

    if (!segments.length) {
      throw new Error('No transcript available for this video. The creator may have disabled captions.');
    }

    const text = buildTranscriptText(segments);
    const last = segments[segments.length - 1];
    const durationMs = last ? last.offset + (last.duration || 0) : 0;

    return { text, durationSeconds: Math.floor(durationMs / 1000), segmentCount: segments.length };
  } catch (err) {
    // Re-throw clean user-facing errors as-is
    if (err.message.startsWith('No transcript')) throw err;

    const detail = (err.stderr || err.message || '').toLowerCase();
    console.error('[yt-dlp] stdout:', err.stdout);
    console.error('[yt-dlp] stderr:', err.stderr);
    console.error('[yt-dlp] message:', err.message);
    if (detail.includes('not found') || detail.includes('not recognized') || err.code === 'ENOENT') {
      throw new Error('yt-dlp binary not found. Set YT_DLP_PATH in your environment.');
    }
    if (detail.includes('subtitle') || detail.includes('caption') || detail.includes('no subtitles')) {
      throw new Error('No transcript available for this video. The creator may have disabled captions.');
    }
    throw new Error('Could not fetch transcript. Try again in a moment.');
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

module.exports = { extractVideoId, getTranscript };
