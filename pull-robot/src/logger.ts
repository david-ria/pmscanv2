import pino from 'pino';

// Initialize logger with simplified configuration to avoid transport issues
export const logger =
  process.env.NODE_ENV === 'production'
    ? pino({
        level: process.env.LOG_LEVEL || 'info',
      })
    : pino({
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