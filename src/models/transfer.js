const {
  Model,
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Transfer extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Transfer.belongsTo(models.User, {
        foreignKey: {
          field: 'playerId',
          allowNull: false,
        },
        as: 'owner',
      });

      Transfer.belongsTo(models.Team, {
        foreignKey: {
          field: 'initialTeamId',
          allowNull: true,
        },
        as: 'initialTeam',
      });

      Transfer.belongsTo(models.Team, {
        foreignKey: {
          field: 'targetTeamId',
          allowNull: false,
        },
        as: 'targetTeam',
      });
    }

    json() {
      return {
        status: Transfer.statuses[this.status],
      };
    }
  }

  Transfer.statuses = {
    WAITING_TEAM_APPROVAL: 'WAITING_TEAM_APPROVAL',
    REJECTED_BY_TEAM: 'REJECTED_BY_TEAM',
    WAITING_PLAYER_APPROVAL: 'WAITING_PLAYER_APPROVAL',
    REJECTED_BY_PLAYER: 'REJECTED_BY_PLAYER',
    SUCCESS: 'SUCCESS',
  };

  Transfer.init({
    status: {
      type: DataTypes.ENUM,
      values: Object.values(Transfer.statuses),
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'Transfer',
  });

  return Transfer;
};
