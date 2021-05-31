const ExpressJWT = require('express-jwt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const config = require('../config/auth');
const { User, RefreshToken, Team } = require('./models');

const setReqUser = (req, res, next) => {
  if (!req.payload || !req.payload.id) {
    return next();
  }

  return User.findByPk(req.payload.id, {
    include: [{
      model: Team,
      as: 'team',
    }],
  })
    .then((user) => {
      if (user) {
        req.user = user;
      }

      return next();
    });
};

const generateUserToken = (user, secret, lifetime) => jwt.sign({
  id: user.id,
  email: user.email,
}, secret, {
  expiresIn: lifetime,
});

module.exports = {
  authType: {
    required: [ExpressJWT({
      secret: config.accessToken.secret,
      userProperty: 'payload',
      algorithms: ['HS256'],
    }), setReqUser],
    optional: [ExpressJWT({
      secret: config.accessToken.secret,
      userProperty: 'payload',
      credentialsRequired: false,
      algorithms: ['HS256'],
    }), setReqUser],
  },
  generateSalt: () => crypto.randomBytes(16).toString('hex'),
  generateHash: (password, salt) => crypto.pbkdf2Sync(password, salt, 10000, 512, 'sha512').toString('hex'),
  generateUserToken,
  generateUserRefreshToken: (user, accessToken = null) => {
    const refreshToken = generateUserToken(
      user,
      config.refreshToken.secret,
      config.refreshToken.lifetime,
    );

    return RefreshToken.create({
      value: refreshToken,
      accessToken,
      userId: user.id,
    });
  },
};
