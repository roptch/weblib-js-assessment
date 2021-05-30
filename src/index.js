const http = require('http');

const config = require('../config/main');
const logger = require('./logger');
const app = require('./app');

const server = http.createServer(app);
server.listen(config.server.port, () => {
  logger.info(`Listening on ${config.server.port}`);
});
