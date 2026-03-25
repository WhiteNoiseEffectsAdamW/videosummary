require('dotenv').config();
const { db } = require('../src/db');
const { sendNudge } = require('../src/services/email');

async function run() {
  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY not set');
    process.exit(1);
  }

  const users = await db('users')
    .whereNotIn('id', db('subscriptions').select('user_id').whereNotNull('user_id'))
    .whereNotIn('id', db('user_saves').select('user_id').where('dismissed', false))
    .select('id', 'email');

  console.log(`Found ${users.length} user(s) to nudge`);

  for (const user of users) {
    try {
      await sendNudge(user.email);
      await db('users').where('id', user.id).update({ nudge_sent_at: new Date() });
      console.log(`✓ Sent to ${user.email}`);
    } catch (err) {
      console.error(`✗ Failed for ${user.email}:`, err.message);
    }
  }

  console.log('Done.');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
