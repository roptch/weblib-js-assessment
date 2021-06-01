const passport = require('passport');
const LocalStrategy = require('passport-local');

const { User } = require('./models');

passport.use(new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password',
}, (email, password, done) => {
  User.findOne({ where: { email } })
    .then((user) => {
      if (!user || !user.validatePassword(password)) {
        return done(null, false, {
          errors: [{
            msg: 'Login failed',
          }],
        });
      }

      return done(null, user);
    })
    .catch(done);
}));
