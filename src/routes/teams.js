const express = require('express');

const { authType } = require('../auth');
const validateSchema = require('../middlewares/validateSchema');
const { User, Team, Transfer } = require('../models');
const { createTeamSchema, updateTeamSchema, teamParamsSchema } = require('../schemas/teams');

const router = express.Router();

router.get('/', authType.optional, (req, res) => Team.findAll({
  include: [{
    model: User,
    as: 'players',
  }],
})
  .then((teams) => res.json({
    teams: teams.map((team) => ({
      ...team.json(),
      players: team.players.map((player) => player.json()),
    })),
  })));

router.post('/', authType.required, validateSchema(createTeamSchema), async (req, res) => {
  if (req.user.team) {
    return res.status(400).json({
      errors: [{
        msg: 'You can\'t create a team while being already a player in another one',
      }],
    });
  }

  const team = await Team.create({
    name: req.body.name,
    ownerId: req.user.id,
  });

  return res.json(team.json());
});

router.get(
  '/:teamId',
  authType.optional,
  validateSchema(teamParamsSchema),
  async (req, res) => res.json({
    team: {
      ...req.params.team.json(),
      players: req.params.team.players.map((player) => player.json()),
    },
  }),
);

router.put(
  '/:teamId',
  authType.required,
  validateSchema(teamParamsSchema),
  validateSchema(updateTeamSchema),
  async (req, res) => {
    const { team } = req.params;

    if (team.owner.id !== req.user.id) {
      return res.status(401).json({
        errors: [{
          msg: 'You are not authorized to manage this team',
        }],
      });
    }

    team.name = req.body.name;
    await team.save();

    return res.json({
      team: {
        ...team.json(),
        players: team.players.map((player) => player.json()),
      },
    });
  },
);

router.delete('/:teamId', authType.required, validateSchema(teamParamsSchema), async (req, res) => {
  const { team } = req.params;

  if (team.owner.id !== req.user.id) {
    return res.status(401).json({
      errors: [{
        msg: 'You are not authorized to manage this team',
      }],
    });
  }

  await team.destroy();

  return res.json({
    deleted: true,
  });
});

router.get(
  '/:teamId/transfers',
  authType.required,
  validateSchema(teamParamsSchema),
  async (req, res) => {
    const { team } = req.params;

    if (team.owner.id !== req.user.id) {
      return res.status(401).json({
        errors: [{
          msg: 'You are not authorized to manage this team',
        }],
      });
    }

    const transfersOut = await Transfer.findAll({
      where: { initialTeamId: team.id },
      order: [['status', 'ASC']],
      include: [{
        model: User,
        as: 'player',
      }, {
        model: Team,
        as: 'initialTeam',
      }, {
        model: Team,
        as: 'targetTeam',
      }],
    });
    const transfersIn = await Transfer.findAll({
      where: { targetTeamId: team.id },
      order: [['status', 'ASC']],
      include: [{
        model: User,
        as: 'player',
      }, {
        model: Team,
        as: 'initialTeam',
      }, {
        model: Team,
        as: 'targetTeam',
      }],
    });

    return res.json({
      transfers: {
        out: transfersOut.map((transfer) => ({
          id: transfer.id,
          player: transfer.player.json(),
          initialTeam: transfer.initialTeam && transfer.initialTeam.json(),
          targetTeam: transfer.targetTeam.json(),
          ...transfer.json(),
        })),
        in: transfersIn.map((transfer) => ({
          id: transfer.id,
          player: transfer.player.json(),
          initialTeam: transfer.initialTeam && transfer.initialTeam.json(),
          targetTeam: transfer.targetTeam.json(),
          ...transfer.json(),
        })),
      },
    });
  },
);

module.exports = router;
