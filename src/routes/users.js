const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const sequelize = require('sequelize');

const { authType, generateUserToken, generateUserRefreshToken } = require('../auth');
const authConfig = require('../../config/auth');
const validateSchema = require('../middlewares/validateSchema');
const { userLoginSchema, userRegisterSchema, userRefreshTokenSchema } = require('../schemas/users');

const {
  User, RefreshToken, Team, Transfer,
} = require('../models');

const { UniqueConstraintError } = sequelize;

const router = express.Router();

router.post('/signup', authType.optional, validateSchema(userRegisterSchema), (req, res) => {
  const user = User.build({
    email: req.body.email,
    firstName: req.body.firstName,
    lastName: req.body.lastName,
  });
  user.setPassword(req.body.password);

  return user.save()
    .then(() => res.json({
      user: user.json(),
    }))
    .catch((err) => {
      if (err instanceof UniqueConstraintError) {
        return res.status(400).json({
          errors: [{
            msg: 'User already exists',
          }],
        });
      }

      throw err;
    });
});

router.post(
  '/signin',
  authType.optional,
  validateSchema(userLoginSchema),
  (req, res, next) => passport.authenticate('local', { session: false }, (err, user, info) => {
    if (err) {
      return next(err);
    }

    if (!user) {
      return res.status(400).json({
        errors: [{
          msg: 'Email or password not matching',
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
          user: user.json(),
          accessToken,
        });
      });
  })(req, res, next),
);

router.post(
  '/refreshToken',
  authType.optional,
  validateSchema(userRefreshTokenSchema),
  (req, res) => RefreshToken.findOne({
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
        return res.status(400).json({
          errors: [{
            msg: 'Invalid refresh token',
          }],
        });
      }

      return jwt.verify(refreshToken.value, authConfig.refreshToken.secret, (err) => {
        if (err) {
          return res.status(400).json({
            errors: [{
              msg: 'Invalid refresh token (probably expired)',
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
            user: refreshToken.user.json(),
            accessToken,
          }));
      });
    }),
);

router.post('/signout', authType.optional, async (req, res) => {
  const ret = {
    loggedOut: true,
  };

  if (!req.cookies.refreshToken) {
    return res.json(ret);
  }

  res.clearCookie('refreshToken');

  await RefreshToken.update({
    active: false,
  }, {
    where: {
      value: req.cookies.refreshToken,
      active: true,
    },
  });

  return res.json(ret);
});

router.get('/me', authType.required, async (req, res) => {
  if (req.user.team) {
    // Team player

    return res.json({
      user: {
        ...req.user.json(),
        team: req.user.team.json(),
      },
    });
  }

  // Team(s) owner
  const ownedTeams = await req.user.getOwnedTeams();
  return res.json({
    user: {
      ...req.user.json(),
      ownedTeams: ownedTeams.map((ownedTeam) => ownedTeam.json()),
    },
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
