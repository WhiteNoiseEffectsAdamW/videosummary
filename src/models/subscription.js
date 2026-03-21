const { db } = require('../db');

const TABLE = 'subscriptions';

async function findByUserId(userId) {
  return db(TABLE).where({ user_id: userId, active: true }).orderBy('created_at', 'asc');
}

async function create({ userId, channelId, channelName }) {
  await db(TABLE).insert({ user_id: userId, channel_id: channelId, channel_name: channelName });
  return db(TABLE).where({ user_id: userId, channel_id: channelId }).first();
}

async function remove({ userId, subscriptionId }) {
  return db(TABLE).where({ id: subscriptionId, user_id: userId }).delete();
}

async function findAll() {
  return db(TABLE).where({ active: true });
}

module.exports = { findByUserId, create, remove, findAll };
