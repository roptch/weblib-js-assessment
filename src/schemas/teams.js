const { User, Team } = require('../models');

const checkTeam = (value, { req }) => Team.findByPk(value, {
  include: [{
    model: User,
    as: 'players',
  }, {
    model: User,
    as: 'owner',
  }],
});

module.exports = {
  // create team
  createTeamSchema: {
    name: {
      in: ['body'],
      notEmpty: true,
    },
  },

  // update team
  updateTeamSchema: {
    name: {
      in: ['body'],
      notEmpty: true,
    },
  },

  // team id in params
  teamParamsSchema: {
    teamId: {
      in: ['params'],
      custom: {
        options:
          (value, { req }) => Team.findByPk(value, {
            include: [{
              model: User,
              as: 'players',
            }, {
              model: User,
              as: 'owner',
            }],
          }).then((team) => {
            if (!team) {
              return Promise.reject(new Error('Team not found'));
            }

            req.params.team = team;
            return true;
          }),
      },
    },
  },
};
