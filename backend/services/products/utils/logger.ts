// backend/services/products/utils/logger.js
import winston from 'winston';
import config from '/app/shared/config.js';

const pligsLogger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'products' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Add file transport if logging is enabled
if (config.logging.enabled) {
  pligsLogger.add(new winston.transports.File({
    filename: config.logging.file,
    level: 'error'
  }));
}

export default pligsLogger;