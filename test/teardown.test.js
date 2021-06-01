const chai = require('chai');

const { sequelize } = require('../src/models');

chai.should();

// Close database connection after all tests
after(() => sequelize.close());
