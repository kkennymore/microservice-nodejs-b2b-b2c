// backend/services/auth/utils/logger.ts
import * as winston from 'winston';
import config from '../../../shared/config';

const pligsLogger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'auth' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

if (config.logging.enabled) {
  pligsLogger.add(new winston.transports.File({
    filename: config.logging.file.replace('.log', '_auth.log')
  }));
}

export default pligsLogger;