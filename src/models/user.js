const {
  Model,
} = require('sequelize');

const crypto = require('crypto');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      User.hasMany(models.RefreshToken, {
        foreignKey: 'userId',
        as: 'refreshTokens',
      });

      User.hasMany(models.Team, {
        foreignKey: 'ownerId',
        as: 'ownedTeams',
      });

      User.belongsTo(models.Team, {
        foreignKey: {
          field: 'teamId',
          allowNull: true,
        },
        as: 'team',
      });

      User.hasMany(models.Transfer, {
        foreignKey: 'playerId',
        as: 'transfers',
      });
    }

    static generateSalt() {
      return crypto.randomBytes(16).toString('hex');
    }

    static generateHash(password, salt) {
      return crypto.pbkdf2Sync(password, salt, 10000, 512, 'sha512').toString('hex');
    }

    setPassword(password) {
      this.salt = User.generateSalt();
      this.hash = User.generateHash(password, this.salt);
    }

    validatePassword(password) {
      return User.generateHash(password, this.salt) === this.hash;
    }

    json() {
      return {
        id: this.id,
        email: this.email,
        firstName: this.firstName,
        lastName: this.lastName,
      };
    }
  }

  User.init({
    firstName: {
      allowNull: false,
      type: DataTypes.STRING,
    },
    lastName: {
      allowNull: false,
      type: DataTypes.STRING,
    },
    email: {
      allowNull: false,
      unique: true,
      type: DataTypes.STRING,
    },
    hash: {
      allowNull: false,
      type: DataTypes.STRING(2000),
    },
    salt: {
      allowNull: false,
      type: DataTypes.STRING,
    },
  }, {
    sequelize,
    modelName: 'User',
  });

  return User;
};
