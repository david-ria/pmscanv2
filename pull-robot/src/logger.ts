import pino from 'pino';

// Simple logger setup that works
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

// Create child loggers for different components
export const createLogger = (component: string) => {
  return logger.child({ component });
};