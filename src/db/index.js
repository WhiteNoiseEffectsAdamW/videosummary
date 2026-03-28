require('dotenv').config();
const knex = require('knex');

const isPg = !!process.env.DATABASE_URL;

const db = knex(
  isPg
    ? {
        client: 'pg',
        connection: process.env.DATABASE_URL,
        pool: { min: 2, max: 10 },
      }
    : {
        client: 'sqlite3',
        connection: { filename: './videosummary.db' },
        useNullAsDefault: true,
        pool: {
          afterCreate(conn, done) {
            conn.run('PRAGMA foreign_keys = ON', done);
          },
        },
      }
);

async function migrate() {
  const exists = await db.schema.hasTable('summaries');
  if (!exists) {
    await db.schema.createTable('summaries', (t) => {
      t.increments('id').primary();
      t.string('video_id').unique().notNullable();
      t.string('channel_id');
      t.string('title');
      t.text('summary_json').notNullable();
      t.integer('transcript_length');
      t.timestamps(true, true);
    });
  } else {
    const hasChannelId = await db.schema.hasColumn('summaries', 'channel_id');
    if (!hasChannelId) {
      await db.schema.alterTable('summaries', (t) => t.string('channel_id'));
    }
    const hasSummarizedBy = await db.schema.hasColumn('summaries', 'summarized_by');
    if (!hasSummarizedBy) {
      await db.schema.alterTable('summaries', (t) => t.integer('summarized_by'));
    }
    const hasChannelName = await db.schema.hasColumn('summaries', 'channel_name');
    if (!hasChannelName) {
      await db.schema.alterTable('summaries', (t) => t.string('channel_name'));
    }
  }

  // Phase 2 tables — stubbed now so the schema is in place
  const hasUsers = await db.schema.hasTable('users');
  if (!hasUsers) {
    await db.schema.createTable('users', (t) => {
      t.increments('id').primary();
      t.string('email').unique().notNullable();
      t.string('password_hash').notNullable();
      t.string('name');
      t.boolean('email_digest').defaultTo(false);
      t.timestamps(true, true);
    });
  } else {
    const hasPasswordHash = await db.schema.hasColumn('users', 'password_hash');
    if (!hasPasswordHash) {
      await db.schema.alterTable('users', (t) => t.string('password_hash'));
    }
    // Add email_digest preference — defaultTo(false): opt-in only
    const hasEmailDigest = await db.schema.hasColumn('users', 'email_digest');
    if (!hasEmailDigest) {
      await db.schema.alterTable('users', (t) => t.boolean('email_digest').defaultTo(false));
    }
    // Password reset columns
    const hasResetToken = await db.schema.hasColumn('users', 'reset_token');
    if (!hasResetToken) {
      await db.schema.alterTable('users', (t) => {
        t.string('reset_token');
        t.timestamp('reset_token_expires');
      });
    }
    // Email verification columns
    const hasEmailVerified = await db.schema.hasColumn('users', 'email_verified');
    if (!hasEmailVerified) {
      await db.schema.alterTable('users', (t) => {
        t.boolean('email_verified').defaultTo(false);
        t.string('verification_token');
        t.timestamp('verification_token_expires');
      });
    }
    // Nudge email tracking
    const hasNudgeSentAt = await db.schema.hasColumn('users', 'nudge_sent_at');
    if (!hasNudgeSentAt) {
      await db.schema.alterTable('users', (t) => t.timestamp('nudge_sent_at'));
    }
  }

  const hasSaves = await db.schema.hasTable('user_saves');
  if (!hasSaves) {
    await db.schema.createTable('user_saves', (t) => {
      t.increments('id').primary();
      t.integer('user_id').notNullable();
      t.string('video_id').notNullable();
      t.boolean('dismissed').defaultTo(false);
      t.timestamps(true, true);
      t.unique(['user_id', 'video_id']);
    });
  }

  const hasSubs = await db.schema.hasTable('subscriptions');
  if (!hasSubs) {
    await db.schema.createTable('subscriptions', (t) => {
      t.increments('id').primary();
      t.integer('user_id').references('id').inTable('users').onDelete('CASCADE');
      t.string('channel_id').notNullable();
      t.string('channel_name');
      t.boolean('active').defaultTo(true);
      t.boolean('digest').defaultTo(true);
      t.boolean('include_shorts').defaultTo(false);
      t.timestamps(true, true);
      t.unique(['user_id', 'channel_id']);
    });
  } else {
    const hasDigest = await db.schema.hasColumn('subscriptions', 'digest');
    if (!hasDigest) {
      await db.schema.alterTable('subscriptions', (t) => t.boolean('digest').defaultTo(true));
    }
    const hasIncludeShorts = await db.schema.hasColumn('subscriptions', 'include_shorts');
    if (!hasIncludeShorts) {
      await db.schema.alterTable('subscriptions', (t) => t.boolean('include_shorts').defaultTo(false));
    }
  }

  const hasDuration = await db.schema.hasColumn('summaries', 'duration_seconds');
  if (!hasDuration) {
    await db.schema.alterTable('summaries', (t) => t.integer('duration_seconds'));
  }
}

module.exports = { db, migrate };
