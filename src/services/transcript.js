const { YoutubeTranscript } = require('youtube-transcript');

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchTranscriptWithRetry(videoId, attempt = 1) {
  try {
    const segments = await YoutubeTranscript.fetchTranscript(videoId);
    return segments;
  } catch (err) {
    if (attempt >= MAX_RETRIES) {
      const msg = err.message || String(err);
      if (msg.includes('Could not find any transcripts')) {
        throw new Error('No transcript available for this video. It may be disabled or not yet generated.');
      }
      throw new Error(`Failed to fetch transcript after ${MAX_RETRIES} attempts: ${msg}`);
    }
    await sleep(RETRY_DELAY_MS * attempt);
    return fetchTranscriptWithRetry(videoId, attempt + 1);
  }
}

// Converts offset (ms) to HH:MM:SS string.
function formatTimestamp(offsetMs) {
  const totalSeconds = Math.floor(offsetMs / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}

// Flattens transcript segments into a single string, with inline timestamps every ~60 seconds.
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

async function getTranscript(videoId) {
  const segments = await fetchTranscriptWithRetry(videoId);
  const text = buildTranscriptText(segments);
  const durationMs = segments.length
    ? segments[segments.length - 1].offset + (segments[segments.length - 1].duration || 0)
    : 0;
  return { text, durationSeconds: Math.floor(durationMs / 1000), segmentCount: segments.length };
}

module.exports = { extractVideoId, getTranscript };
