const process = require('process');

module.exports = {
  development: {
    username: process.env.WEBLIB_DB_USER,
    password: process.env.WEBLIB_DB_PW,
    database: 'weblib_development',
    host: process.env.WEBLIB_DB_HOST,
    dialect: 'postgres',
  },
  test: {
    username: process.env.WEBLIB_DB_USER,
    password: process.env.WEBLIB_DB_PW,
    database: 'weblib_test',
    host: process.env.WEBLIB_DB_HOST,
    dialect: 'postgres',
    logging: false,
  },
  production: {
    username: process.env.WEBLIB_DB_USER,
    password: process.env.WEBLIB_DB_PW,
    database: 'weblib_production',
    host: process.env.WEBLIB_DB_HOST,
    dialect: 'postgres',
  },
};
