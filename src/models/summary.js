const { db } = require('../db');

const TABLE = 'summaries';

async function findByVideoId(videoId) {
  const row = await db(TABLE).where({ video_id: videoId }).first();
  if (!row) return null;
  return {
    ...row,
    summary: JSON.parse(row.summary_json),
  };
}

async function create({ videoId, title, summary, transcriptLength }) {
  await db(TABLE).insert({
    video_id: videoId,
    title,
    summary_json: JSON.stringify(summary),
    transcript_length: transcriptLength,
  });
  return findByVideoId(videoId);
}

module.exports = { findByVideoId, create };
