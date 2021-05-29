import winston from 'winston';
import path from 'path';
import url from 'url';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: path.join(path.dirname(url.fileURLToPath(import.meta.url)), '../logs/error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join(path.dirname(url.fileURLToPath(import.meta.url)), '../logs/combined.log') }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

export default logger;
