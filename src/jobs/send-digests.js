const cron = require('node-cron');
const { db } = require('../db');
const { findByChannelIdsSince } = require('../models/summary');
const { sendDigest } = require('../services/email');

const LOOKBACK_HOURS = 25;

async function sendAllDigests() {
  console.log('[digest] starting');

  if (!process.env.RESEND_API_KEY) {
    console.warn('[digest] RESEND_API_KEY not set, skipping');
    return;
  }

  const since = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000);

  // Get users with active subscriptions and digest enabled (null treated as true for existing rows)
  const users = await db('users')
    .join('subscriptions', 'users.id', 'subscriptions.user_id')
    .where('subscriptions.active', true)
    .where(function () {
      this.where('users.email_digest', true).orWhereNull('users.email_digest');
    })
    .distinct('users.id', 'users.email')
    .select('users.id', 'users.email');

  console.log(`[digest] sending to ${users.length} user(s)`);

  for (const user of users) {
    try {
      const channelIds = await db('subscriptions')
        .where({ user_id: user.id, active: true })
        .pluck('channel_id');

      const summaries = await findByChannelIdsSince(channelIds, since);
      if (!summaries.length) {
        console.log(`[digest] no new summaries for ${user.email}, skipping`);
        continue;
      }

      await sendDigest(user.email, summaries);
      console.log(`[digest] sent ${summaries.length} summaries to ${user.email}`);
    } catch (err) {
      console.error(`[digest] failed for ${user.email}:`, err.message);
    }
  }

  console.log('[digest] done');
}

function startDigestJob() {
  // Run at 7am UTC every day
  cron.schedule('0 7 * * *', sendAllDigests);
  console.log('[digest] scheduled — runs daily at 7am UTC');
}

module.exports = { startDigestJob, sendAllDigests };
