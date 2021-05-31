const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const sequelize = require('sequelize');

const { authType, generateUserToken, generateUserRefreshToken } = require('../auth');
const authConfig = require('../../config/auth');

const {
  User, RefreshToken, Team, Transfer,
} = require('../models');

const { UniqueConstraintError } = sequelize;

const router = express.Router();

router.post('/signup', authType.optional, (req, res) => {
  if (!req.body.user || !req.body.user.email || !req.body.user.password
    || !req.body.user.firstName || !req.body.user.lastName
  ) {
    // @TODO: error management
    return res.status(400).json({
      errors: [{
        title: 'Missing fields',
        detail: 'Required fields: user[email], user[password], user[firstName], user[lastName]',
      }],
    });
  }

  const user = User.build({
    email: req.body.user.email,
    firstName: req.body.user.firstName,
    lastName: req.body.user.lastName,
  });
  user.setPassword(req.body.user.password);

  return user.save()
    .then(() => res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    }))
    .catch((err) => {
      if (err instanceof UniqueConstraintError) {
        // @TODO: error management
        return res.status(400).json({
          errors: [{
            title: 'User already exists',
            detail: 'Email already in use',
          }],
        });
      }

      // @TODO: error management
      return res.status(400).json({
        errors: [
          {
            title: 'Unknown error',
          },
        ],
      });
    });
});

router.post('/signin', authType.optional, (req, res, next) => {
  if (!req.body.user || !req.body.user.email || !req.body.user.password) {
    // @TODO: error management
    return res.status(422).json({
      errors: [{
        title: 'Missing fields',
        detail: 'Required fields: user[email], user[password]',
      }],
    });
  }

  return passport.authenticate('local', { session: false }, (err, user, info) => {
    if (err) {
      return next(err);
    }

    if (!user) {
      // @TODO: error management
      return res.status(400).json({
        errors: [{
          title: 'Email or password not matching',
        }],
      });
    }

    const accessToken = generateUserToken(
      user,
      authConfig.accessToken.secret,
      authConfig.accessToken.lifetime,
    );
    return generateUserRefreshToken(user, accessToken)
      .then((userRefreshToken) => {
        res.cookie('refreshToken', userRefreshToken.value, {
          httpOnly: true,
        });

        return res.json({
          user: {
            id: user.id,
            email: user.email,
            firstname: user.firstname,
            lastname: user.lastname,
          },
          accessToken,
        });
      });
  })(req, res, next);
});

router.post('/refreshToken', authType.optional, (req, res) => {
  if (!req.cookies.refreshToken) {
    // @TODO: error management
    return res.status(400).json({
      errors: [{
        title: 'Missing refresh token',
      }],
    });
  }

  return RefreshToken.findOne({
    where: {
      value: req.cookies.refreshToken,
      active: true,
    },
    include: [{
      model: User,
      as: 'user',
    }],
  })
    .then((refreshToken) => {
      if (!refreshToken) {
        // @TODO: error management
        return res.status(400).json({
          errors: [{
            title: 'Invalid refresh token',
          }],
        });
      }

      return jwt.verify(refreshToken.value, authConfig.refreshToken.secret, (err) => {
        if (err) {
          // @TODO: error management
          return res.status(400).json({
            errors: [{
              title: 'Invalid refresh token',
              detail: 'Token probably expired',
            }],
          });
        }

        const accessToken = generateUserToken(
          refreshToken.user,
          authConfig.accessToken.secret,
          authConfig.accessToken.lifetime,
        );

        refreshToken.accessToken = accessToken;
        return refreshToken.save()
          .then(() => res.json({
            user: {
              id: refreshToken.user.id,
              email: refreshToken.user.email,
              firstname: refreshToken.user.firstname,
              lastname: refreshToken.user.lastname,
            },
            accessToken,
          }));
      });
    });
});

router.post('/signout', authType.optional, async (req, res, next) => {
  const ret = {
    loggedOut: true,
  };

  if (!req.cookies.refreshToken) {
    return res.json(ret);
  }

  res.clearCookie('refreshToken');

  try {
    await RefreshToken.update({
      active: false,
    }, {
      where: {
        value: req.cookies.refreshToken,
        active: true,
      },
    });
  } catch (e) {
    next();
  }

  res.clearCookie('refreshToken');
  return res.json(ret);
});

router.get('/me', authType.required, async (req, res) => {
  if (req.user.team) {
    // Team player

    return res.json({
      ...req.user.json(),
      team: req.user.team.json(),
    });
  }

  // Team(s) owner
  const ownedTeams = await req.user.getOwnedTeams();
  return res.json({
    ...req.user.json(),
    ownedTeams: ownedTeams.map((ownedTeam) => ownedTeam.json()),
  });
});

router.get('/me/transfers', authType.required, async (req, res) => {
  const transfers = await Transfer.findAll({
    where: { playerId: req.user.id },
    order: [['status', 'ASC']],
    include: [{
      model: Team,
      as: 'initialTeam',
    }, {
      model: Team,
      as: 'targetTeam',
    }],
  });

  return res.json({
    transfers: transfers.map((transfer) => ({
      id: transfer.id,
      player: req.user.json(),
      initialTeam: transfer.initialTeam && transfer.initialTeam.json(),
      targetTeam: transfer.targetTeam.json(),
      ...transfer.json(),
    })),
  });
});

module.exports = router;
