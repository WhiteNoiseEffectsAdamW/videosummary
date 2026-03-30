const { db } = require('../db');

const TABLE = 'subscriptions';

async function findByUserId(userId) {
  return db(TABLE).where({ user_id: userId, active: true }).orderBy('sort_order', 'asc').orderBy('created_at', 'asc');
}

async function create({ userId, channelId, channelName }) {
  const maxRow = await db(TABLE).where({ user_id: userId }).max('sort_order as m').first();
  const sortOrder = (maxRow?.m ?? -1) + 1;
  await db(TABLE).insert({ user_id: userId, channel_id: channelId, channel_name: channelName, sort_order: sortOrder });
  return db(TABLE).where({ user_id: userId, channel_id: channelId }).first();
}

// orderedIds: array of subscription IDs in desired order
async function reorder({ userId, orderedIds }) {
  await Promise.all(
    orderedIds.map((id, i) => db(TABLE).where({ id, user_id: userId }).update({ sort_order: i }))
  );
}

async function remove({ userId, subscriptionId }) {
  return db(TABLE).where({ id: subscriptionId, user_id: userId }).delete();
}

async function setDigest({ userId, subscriptionId, digest }) {
  return db(TABLE).where({ id: subscriptionId, user_id: userId }).update({ digest });
}

async function setIncludeShorts({ userId, subscriptionId, includeShorts }) {
  return db(TABLE).where({ id: subscriptionId, user_id: userId }).update({ include_shorts: includeShorts });
}

async function findAll() {
  return db(TABLE).where({ active: true });
}

module.exports = { findByUserId, create, remove, findAll, setDigest, setIncludeShorts, reorder };
