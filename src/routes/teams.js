const express = require('express');

const { authType } = require('../auth');
const { User, Team, Transfer } = require('../models');

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

router.post('/', authType.required, async (req, res) => {
  if (!req.body.team || !req.body.team.name) {
    return res.status(400).json({
      errors: [{
        title: 'Missing fields',
        detail: 'Required fields: team[name]',
      }],
    });
  }

  if (req.user.team) {
    return res.status(400).json({
      errors: [{
        title: 'You can\'t create a team while being already a player in another one',
      }],
    });
  }

  const team = await Team.create({
    name: req.body.team.name,
    ownerId: req.user.id,
  });

  return res.json(team.json());
});

router.get('/:teamId', authType.optional, async (req, res) => {
  const team = await Team.findByPk(req.params.teamId, {
    include: [{
      model: User,
      as: 'players',
    }],
  });
  if (!team) {
    return res.status(404).json({
      errors: [{
        title: 'Team not found',
      }],
    });
  }

  return res.json({
    team: {
      ...team.json(),
      players: team.players.map((player) => player.json()),
    },
  });
});

router.put('/:teamId', authType.required, async (req, res) => {
  const team = await Team.findByPk(req.params.teamId, {
    include: [{
      model: User,
      as: 'players',
    }, {
      model: User,
      as: 'owner',
    }],
  });
  if (!team) {
    return res.status(404).json({
      errors: [{
        title: 'Team not found',
      }],
    });
  }

  if (team.owner.id !== req.user.id) {
    return res.status(401).json({
      errors: [{
        title: 'You are not authorized to manage this team',
      }],
    });
  }

  if (!req.body.team || !req.body.team.name) {
    return res.status(400).json({
      errors: [{
        title: 'Missing fields',
        detail: 'Required fields: team[name]',
      }],
    });
  }

  team.name = req.body.team.name;
  await team.save();

  return res.json({
    team: {
      ...team.json(),
      players: team.players.map((player) => player.json()),
    },
  });
});

router.delete('/:teamId', authType.required, async (req, res) => {
  const team = await Team.findByPk(req.params.teamId, {
    include: [{
      model: User,
      as: 'owner',
    }],
  });
  if (!team) {
    return res.status(404).json({
      errors: [{
        title: 'Team not found',
      }],
    });
  }

  if (team.owner.id !== req.user.id) {
    return res.status(401).json({
      errors: [{
        title: 'You are not authorized to manage this team',
      }],
    });
  }

  await team.destroy();

  return res.json({
    deleted: true,
  });
});

router.get('/:teamId/transfers', authType.required, async (req, res) => {
  const team = await Team.findByPk(req.params.teamId, {
    include: [{
      model: User,
      as: 'owner',
    }],
  });
  if (!team) {
    return res.status(404).json({
      errors: [{
        title: 'Team not found',
      }],
    });
  }

  if (team.owner.id !== req.user.id) {
    return res.status(401).json({
      errors: [{
        title: 'You are not authorized to manage this team',
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
});

module.exports = router;
