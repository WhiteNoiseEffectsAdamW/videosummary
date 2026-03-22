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

async function create({ videoId, channelId, title, summary, transcriptLength, summarizedBy }) {
  await db(TABLE).insert({
    video_id: videoId,
    channel_id: channelId || null,
    summarized_by: summarizedBy || null,
    title,
    summary_json: JSON.stringify(summary),
    transcript_length: transcriptLength,
  });
  return findByVideoId(videoId);
}

async function findByChannelIdsSince(channelIds, since) {
  return db(TABLE)
    .whereIn('channel_id', channelIds)
    .where('created_at', '>=', since)
    .orderBy('created_at', 'desc');
}

async function findByUserId(userId, limit = 50) {
  const rows = await db(TABLE)
    .where({ summarized_by: userId })
    .whereNull('channel_id')
    .orderBy('created_at', 'desc')
    .limit(limit);
  return rows.map((row) => ({ ...row, summary: JSON.parse(row.summary_json) }));
}

async function findByChannelIds(channelIds, limit = 50) {
  const rows = await db(TABLE)
    .whereIn('channel_id', channelIds)
    .orderBy('created_at', 'desc')
    .limit(limit);
  return rows.map((row) => ({ ...row, summary: JSON.parse(row.summary_json) }));
}

module.exports = { findByVideoId, create, findByChannelIdsSince, findByChannelIds, findByUserId };
