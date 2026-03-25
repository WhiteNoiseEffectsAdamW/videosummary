const cron = require('node-cron');
const { db } = require('../db');
const { sendNudge } = require('../services/email');

// Users who signed up more than 24h ago, have no subscriptions, no saved videos,
// and haven't been nudged yet.
async function sendNudges() {
  console.log('[nudge] starting');

  if (!process.env.RESEND_API_KEY) {
    console.warn('[nudge] RESEND_API_KEY not set, skipping');
    return;
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const users = await db('users')
    .whereNull('nudge_sent_at')
    .where('created_at', '<', since)
    .whereNotIn('id', db('subscriptions').select('user_id').whereNotNull('user_id'))
    .whereNotIn('id', db('user_saves').select('user_id').where('dismissed', false))
    .select('id', 'email');

  console.log(`[nudge] ${users.length} user(s) to nudge`);

  for (const user of users) {
    try {
      await sendNudge(user.email);
      await db('users').where('id', user.id).update({ nudge_sent_at: new Date() });
      console.log(`[nudge] sent to ${user.email}`);
    } catch (err) {
      console.error(`[nudge] failed for ${user.email}:`, err.message);
    }
  }

  console.log('[nudge] done');
}

function startNudgeJob() {
  // Run daily at noon UTC (8am ET)
  cron.schedule('0 12 * * *', sendNudges);
  console.log('[nudge] scheduled — runs daily at noon UTC');
}

module.exports = { startNudgeJob, sendNudges };
