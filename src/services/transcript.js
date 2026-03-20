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
  const apiKey = process.env.SUPADATA_API_KEY;
  if (!apiKey) throw new Error('SUPADATA_API_KEY is not set.');

  const url = `https://api.supadata.ai/v1/youtube/transcript?videoId=${videoId}`;
  const res = await fetch(url, { headers: { 'x-api-key': apiKey } });

  if (!res.ok) {
    const body = await res.text();
    if (res.status === 404 || body.toLowerCase().includes('no transcript')) {
      throw new Error('No transcript available for this video. The creator may have disabled captions.');
    }
    throw new Error(`Transcript API error (${res.status}). Try again in a moment.`);
  }

  const data = await res.json();
  const segments = data.content || [];

  if (!segments.length) {
    throw new Error('No transcript available for this video. The creator may have disabled captions.');
  }

  const text = buildTranscriptText(segments);
  const last = segments[segments.length - 1];
  const durationMs = last ? last.offset + (last.duration || 0) : 0;

  return { text, durationSeconds: Math.floor(durationMs / 1000), segmentCount: segments.length };
}

module.exports = { extractVideoId, getTranscript };
