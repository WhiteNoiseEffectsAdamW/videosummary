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

async function setResetToken(id, token, expires) {
  return db(TABLE).where({ id }).update({ reset_token: token, reset_token_expires: expires });
}

async function findByResetToken(token) {
  return db(TABLE).where({ reset_token: token }).where('reset_token_expires', '>', new Date()).first();
}

async function clearResetToken(id, newPasswordHash) {
  return db(TABLE).where({ id }).update({ password_hash: newPasswordHash, reset_token: null, reset_token_expires: null });
}

async function setVerificationToken(id, token, expires) {
  return db(TABLE).where({ id }).update({ verification_token: token, verification_token_expires: expires });
}

async function findByVerificationToken(token) {
  return db(TABLE).where({ verification_token: token }).where('verification_token_expires', '>', new Date()).first();
}

async function markEmailVerified(id) {
  return db(TABLE).where({ id }).update({ email_verified: true, verification_token: null, verification_token_expires: null });
}

async function countAll() {
  const row = await db(TABLE).count('id as n').first();
  return parseInt(row.n, 10);
}

module.exports = { findById, findByEmail, create, updatePreferences, deleteById, setResetToken, findByResetToken, clearResetToken, setVerificationToken, findByVerificationToken, markEmailVerified, countAll };
