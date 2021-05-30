const passport = require('passport');
const LocalStrategy = require('passport-local');

const { User } = require('./models');

passport.use(new LocalStrategy({
  usernameField: 'user[email]',
  passwordField: 'user[password]',
}, (email, password, done) => {
  User.findOne({ where: { email } })
    .then((user) => {
      if (!user || !user.validatePassword(password)) {
        return done(null, false, {
          errors: ['Login failed'], // @TODO: error management
        });
      }

      return done(null, user);
    })
    .catch(done);
}));
