const { Transfer } = require('../src/models');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Transfers', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      playerId: {
        references: {
          model: 'Users',
          key: 'id',
        },
        allowNull: false,
        onDelete: 'CASCADE',
        type: Sequelize.INTEGER,
      },
      initialTeamId: {
        references: {
          model: 'Teams',
          key: 'id',
        },
        allowNull: true,
        onDelete: 'CASCADE',
        type: Sequelize.INTEGER,
      },
      targetTeamId: {
        references: {
          model: 'Teams',
          key: 'id',
        },
        allowNull: false,
        onDelete: 'CASCADE',
        type: Sequelize.INTEGER,
      },
      status: {
        type: Sequelize.ENUM,
        values: Object.values(Transfer.statuses),
        allowNull: false,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Transfers');
  },
};
