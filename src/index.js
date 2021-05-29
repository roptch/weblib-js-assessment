import http from 'http';

import config from '../config/main';
import logger from './logger';
import app from './app';

const server = http.createServer(app);
server.listen(config.server.port, () => {
  logger.info(`Listening on ${config.server.port}`);
});
