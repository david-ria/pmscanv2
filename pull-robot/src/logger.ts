import pino from 'pino';

// Initialize logger with default level to avoid circular dependency
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
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