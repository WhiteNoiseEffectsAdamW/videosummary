const { db } = require('../db');

const TABLE = 'users';

async function findById(id) {
  return db(TABLE).where({ id }).first();
}

async function findByEmail(email) {
  return db(TABLE).where({ email: email.toLowerCase() }).first();
}

async function create({ email, passwordHash, name, emailDigest }) {
  await db(TABLE).insert({
    email: email.toLowerCase(),
    password_hash: passwordHash,
    name: name || null,
    email_digest: emailDigest === true,
  });
  return findByEmail(email);
}

async function deleteById(id) {
  // Delete saves first (no cascade defined on user_saves)
  await db('user_saves').where({ user_id: id }).delete();
  return db(TABLE).where({ id }).delete();
}

async function updatePreferences(id, { emailDigest }) {
  await db(TABLE).where({ id }).update({ email_digest: emailDigest });
  return findById(id);
}

module.exports = { findById, findByEmail, create, updatePreferences, deleteById };
