const {
  Model,
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Team extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Team.belongsTo(models.User, {
        foreignKey: {
          field: 'ownerId',
          allowNull: false,
        },
        as: 'owner',
      });

      Team.hasMany(models.User, {
        foreignKey: 'teamId',
        as: 'players',
      });
    }

    json() {
      return {
        id: this.id,
        name: this.name,
      };
    }
  }

  Team.init({
    name: {
      allowNull: false,
      type: DataTypes.STRING,
    },
  }, {
    sequelize,
    modelName: 'Team',
  });

  return Team;
};
