const { db } = require('../db');
const { nanoid } = require('nanoid');

const TABLE = 'summaries';
const SAVES = 'user_saves';

async function findByVideoId(videoId) {
  const row = await db(TABLE).where({ video_id: videoId }).first();
  if (!row) return null;
  return { ...row, summary: JSON.parse(row.summary_json) };
}

async function findBySlug(slug) {
  const row = await db(TABLE).where({ slug }).first();
  if (!row) return null;
  return { ...row, summary: JSON.parse(row.summary_json) };
}

async function create({ videoId, channelId, channelName, title, summary, transcriptLength, durationSeconds, inputTokens, outputTokens, publishedAt }) {
  const slug = nanoid(10);
  await db(TABLE).insert({
    video_id: videoId,
    slug,
    channel_id: channelId || null,
    channel_name: channelName || null,
    title,
    summary_json: JSON.stringify(summary),
    transcript_length: transcriptLength,
    duration_seconds: durationSeconds || null,
    input_tokens: inputTokens || null,
    output_tokens: outputTokens || null,
    published_at: publishedAt || null,
  });
  return findByVideoId(videoId);
}

// Save a video to a user's My Videos list (idempotent)
async function upsertUserSave(userId, videoId) {
  if (!userId) return;
  const existing = await db(SAVES).where({ user_id: userId, video_id: videoId }).first();
  if (existing) {
    // Un-dismiss if previously dismissed
    if (existing.dismissed) {
      await db(SAVES).where({ user_id: userId, video_id: videoId }).update({ dismissed: false });
    }
  } else {
    await db(SAVES).insert({ user_id: userId, video_id: videoId });
  }
}

// Dismiss a video from a user's My Videos list
async function dismissUserSave(userId, videoId) {
  return db(SAVES).where({ user_id: userId, video_id: videoId }).update({ dismissed: true });
}

// Mark a video as viewed
async function markViewed(userId, videoId) {
  return db(SAVES).where({ user_id: userId, video_id: videoId }).update({ viewed_at: new Date() });
}

// Get all saved (non-dismissed) summaries for a user, optionally limited to since date
async function findSavedByUserId(userId, limit = 100, since = null) {
  let query = db(SAVES)
    .join(TABLE, `${SAVES}.video_id`, `${TABLE}.video_id`)
    .where({ [`${SAVES}.user_id`]: userId, [`${SAVES}.dismissed`]: false })
    .orderBy(`${SAVES}.created_at`, 'desc')
    .limit(limit)
    .select(`${TABLE}.*`, `${SAVES}.created_at as saved_at`, `${SAVES}.viewed_at`);
  if (since) query = query.where(`${SAVES}.created_at`, '>=', since);
  const rows = await query;
  return rows.map((row) => ({ ...row, summary: JSON.parse(row.summary_json) }));
}

async function findByChannelIdsSince(channelIds, since) {
  return db(TABLE)
    .whereIn('channel_id', channelIds)
    .where('created_at', '>=', since)
    .orderBy('created_at', 'desc');
}

// Get saved (non-dismissed) summaries for a user saved since a given date, from followed channels only — used for digest
async function findSavedByUserIdSince(userId, since) {
  const rows = await db(SAVES)
    .join(TABLE, `${SAVES}.video_id`, `${TABLE}.video_id`)
    .join('subscriptions', function () {
      this.on('subscriptions.channel_id', '=', `${TABLE}.channel_id`)
        .andOn('subscriptions.user_id', '=', db.raw('?', [userId]));
    })
    .where({ [`${SAVES}.user_id`]: userId, [`${SAVES}.dismissed`]: false })
    .where('subscriptions.active', true)
    .where(`${SAVES}.created_at`, '>=', since)
    .where(function () {
      // Exclude Shorts unless the user opted in for this channel
      this.where(`${TABLE}.duration_seconds`, '>=', 120)
        .orWhereNull(`${TABLE}.duration_seconds`)
        .orWhere('subscriptions.include_shorts', true);
    })
    .orderBy('subscriptions.sort_order', 'asc')
    .orderBy(`${SAVES}.created_at`, 'desc')
    .select(`${TABLE}.*`, `${SAVES}.created_at as saved_at`);
  return rows.map((row) => ({ ...row, summary: JSON.parse(row.summary_json) }));
}

async function findByChannelIds(channelIds, limit = 50) {
  const rows = await db(TABLE)
    .whereIn('channel_id', channelIds)
    .orderBy('created_at', 'desc')
    .limit(limit);
  return rows.map((row) => ({ ...row, summary: JSON.parse(row.summary_json) }));
}

async function updateTitle(videoId, title) {
  return db(TABLE).where({ video_id: videoId }).update({ title });
}

async function incrementMonthlySummaryCount(userId) {
  if (!userId) return;
  const yearMonth = new Date().toISOString().slice(0, 7); // '2026-04'
  const existing = await db('summary_usage').where({ user_id: userId, year_month: yearMonth }).first();
  if (existing) {
    await db('summary_usage').where({ user_id: userId, year_month: yearMonth }).increment('count', 1);
  } else {
    await db('summary_usage').insert({ user_id: userId, year_month: yearMonth, count: 1 });
  }
}

module.exports = {
  findByVideoId, findBySlug, create, updateTitle,
  upsertUserSave, dismissUserSave, markViewed, findSavedByUserId, findSavedByUserIdSince,
  findByChannelIdsSince, findByChannelIds, incrementMonthlySummaryCount,
};
