const {
  Model,
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class RefreshToken extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      RefreshToken.belongsTo(models.User, {
        foreignKey: {
          field: 'userId',
          allowNull: false,
        },
        as: 'user',
      });
    }
  }

  RefreshToken.init({
    value: {
      allowNull: false,
      type: DataTypes.STRING(500),
    },
    accessToken: {
      allowNull: false,
      type: DataTypes.STRING(500),
    },
    active: {
      allowNull: false,
      defaultValue: true,
      type: DataTypes.BOOLEAN,
    },
  }, {
    sequelize,
    modelName: 'RefreshToken',
  });

  return RefreshToken;
};
