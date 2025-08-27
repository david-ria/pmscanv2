import pino from 'pino';
import { config } from './config.js';

export const logger = pino({
  level: config.logging.level,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'yyyy-mm-dd HH:MM:ss',
      ignore: 'pid,hostname',
    },
  },
});

// Create child loggers for different components
export const createLogger = (component: string) => {
  return logger.child({ component });
};