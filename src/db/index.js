require('dotenv').config();
const knex = require('knex');

const db = knex({
  client: 'sqlite3',
  connection: {
    filename: './videosummary.db',
  },
  useNullAsDefault: true,
  pool: {
    afterCreate(conn, done) {
      conn.run('PRAGMA foreign_keys = ON', done);
    },
  },
});

async function migrate() {
  const exists = await db.schema.hasTable('summaries');
  if (!exists) {
    await db.schema.createTable('summaries', (t) => {
      t.increments('id').primary();
      t.string('video_id').unique().notNullable();
      t.string('title');
      t.text('summary_json').notNullable();
      t.integer('transcript_length');
      t.timestamps(true, true);
    });
  }

  // Phase 2 tables — stubbed now so the schema is in place
  const hasUsers = await db.schema.hasTable('users');
  if (!hasUsers) {
    await db.schema.createTable('users', (t) => {
      t.increments('id').primary();
      t.string('email').unique().notNullable();
      t.string('name');
      t.timestamps(true, true);
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
      t.timestamps(true, true);
      t.unique(['user_id', 'channel_id']);
    });
  }
}

module.exports = { db, migrate };
