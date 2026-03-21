const passport = require('passport');
const { Strategy: LocalStrategy } = require('passport-local');
const bcrypt = require('bcryptjs');
const { findById, findByEmail } = require('../models/user');

passport.use(
  new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
    try {
      const user = await findByEmail(email);
      if (!user) return done(null, false, { message: 'Invalid email or password.' });

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return done(null, false, { message: 'Invalid email or password.' });

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
);

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await findById(id);
    done(null, user || false);
  } catch (err) {
    done(err);
  }
});

module.exports = passport;
