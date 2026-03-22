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
  }

  // Phase 2 tables — stubbed now so the schema is in place
  const hasUsers = await db.schema.hasTable('users');
  if (!hasUsers) {
    await db.schema.createTable('users', (t) => {
      t.increments('id').primary();
      t.string('email').unique().notNullable();
      t.string('password_hash').notNullable();
      t.string('name');
      t.timestamps(true, true);
    });
  } else {
    const hasPasswordHash = await db.schema.hasColumn('users', 'password_hash');
    if (!hasPasswordHash) {
      await db.schema.alterTable('users', (t) => t.string('password_hash'));
    }
  }

  const hasSubs = await db.schema.hasTable('subscriptions');
  if (!hasSubs) {
    await db.schema.createTable('subscriptions', (t) => {
      t.increments('id').primary();
      t.integer('user_id').references('id').inTable('users').onDelete('CASCADE');
      t.string('channel_id').notNullable();
      t.string('channel_name');
      t.boolean('active').defaultTo(true);
      t.timestamps(true, true);
      t.unique(['user_id', 'channel_id']);
    });
  }
}

module.exports = { db, migrate };
