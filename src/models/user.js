const { db } = require('../db');

const TABLE = 'users';

async function findById(id) {
  return db(TABLE).where({ id }).first();
}

async function findByEmail(email) {
  return db(TABLE).where({ email: email.toLowerCase() }).first();
}

async function create({ email, passwordHash, name }) {
  await db(TABLE).insert({
    email: email.toLowerCase(),
    password_hash: passwordHash,
    name: name || null,
  });
  return findByEmail(email);
}

module.exports = { findById, findByEmail, create };
