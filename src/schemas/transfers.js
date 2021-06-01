const { User, Team, Transfer } = require('../models');

module.exports = {
  // create transfer
  createTransferSchema: {
    'player.id': {
      in: ['body'],
      custom: {
        options:
          (value, { req }) => User.findByPk(value, {
            include: [{
              model: Team,
              as: 'team',
            }],
          }).then((player) => {
            if (!player) {
              return Promise.reject(new Error('Player not found'));
            }

            req.body.player = player;
            return true;
          }),
      },
    },
    'targetTeam.id': {
      in: ['body'],
      custom: {
        options:
          (value, { req }) => Team.findByPk(value, {
            include: [{
              model: User,
              as: 'owner',
            }],
          }).then((team) => {
            if (!team) {
              return Promise.reject(new Error('Target team not found'));
            }

            req.body.targetTeam = team;
            return true;
          }),
      },
    },
  },

  // transfer reply
  transferReplySchema: {
    transferId: {
      in: ['params'],
      custom: {
        options:
          (value, { req }) => Transfer.findByPk(value, {
            include: [{
              model: User,
              as: 'player',
            }, {
              model: Team,
              as: 'initialTeam',
              include: [{
                model: User,
                as: 'owner',
              }],
            }, {
              model: Team,
              as: 'targetTeam',
              include: [{
                model: User,
                as: 'owner',
              }],
            }],
          }).then((transfer) => {
            if (!transfer) {
              return Promise.reject(new Error('Transfer not found'));
            }

            req.params.transfer = transfer;
            return true;
          }),
      },
    },
    accept: {
      in: ['body'],
      isBoolean: true,
      toBoolean: true,
    },
  },
};
