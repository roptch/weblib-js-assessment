const express = require('express');

const { authType } = require('../auth');
const { User, Team, Transfer } = require('../models');

const router = express.Router();

router.post('/', authType.required, async (req, res) => {
  if (!req.body.transfer || !req.body.transfer.playerId || !req.body.transfer.targetTeamId) {
    return res.status(400).json({
      errors: [{
        title: 'Missing fields',
        detail: 'Required fields: transfer[playerId], transfer[targetTeamId]',
      }],
    });
  }

  if (req.user.team) {
    return res.status(400).json({
      errors: [{
        title: 'You can\'t create a transfer while being a player in a team',
      }],
    });
  }

  const targetTeam = await Team.findByPk(req.body.transfer.targetTeamId, {
    include: [{
      model: User,
      as: 'owner',
    }],
  });
  if (!targetTeam) {
    return res.status(404).json({
      errors: [{
        title: 'Target team not found',
      }],
    });
  }
  if (targetTeam.owner.id !== req.user.id) {
    return res.status(400).json({
      errors: [{
        title: 'You are not authorized to manage this team',
      }],
    });
  }

  const player = await User.findByPk(req.body.transfer.playerId, {
    include: [{
      model: Team,
      as: 'team',
    }],
  });
  if (!player) {
    return res.status(404).json({
      errors: [{
        title: 'Player not found',
      }],
    });
  }

  if (player.team) {
    if (player.team.id === targetTeam.id) {
      return res.status(400).json({
        errors: [{
          title: 'Impossible transfer because the player is already in the target team',
        }],
      });
    }
  } else {
    const playerOwnedTeams = await player.getOwnedTeams();
    if (playerOwnedTeams.length > 0) {
      return res.status(400).json({
        errors: [{
          title: 'You can\'t recruit this user to your team because he already manages other team(s)',
        }],
      });
    }
  }

  const existingTransfer = await Transfer.findOne({
    where: {
      playerId: player.id,
      targetTeamId: targetTeam.id,
    },
  });
  if (existingTransfer) {
    return res.status(400).json({
      errors: [{
        title: 'There is already a transfer process for this player into this team',
      }],
    });
  }

  const transfer = await Transfer.create({
    playerId: player.id,
    initialTeamId: player.team && player.team.id,
    targetTeamId: targetTeam.id,
    status: Transfer.statuses[player.team ? 'WAITING_TEAM_APPROVAL' : 'WAITING_PLAYER_APPROVAL'],
  });

  return res.json({
    ...transfer.json(),
    player: player.json(),
    initialTeam: player.team && player.team.json(),
    targetTeam: targetTeam.json(),
  });
});

module.exports = router;
