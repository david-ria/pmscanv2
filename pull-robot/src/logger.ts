// Simple console logger that works everywhere
export const logger = {
  info: (message: string, ...args: any[]) => {
    console.log(`[INFO] ${message}`, ...args);
  },
  error: (message: string, ...args: any[]) => {
    console.error(`[ERROR] ${message}`, ...args);
  },
  debug: (message: string, ...args: any[]) => {
    if (process.env.LOG_LEVEL === 'debug') {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(`[WARN] ${message}`, ...args);
  }
};

// Create child loggers for different components  
export const createLogger = (component: string) => {
  return {
    info: (message: string, ...args: any[]) => logger.info(`[${component}] ${message}`, ...args),
    error: (message: string, ...args: any[]) => logger.error(`[${component}] ${message}`, ...args),
    debug: (message: string, ...args: any[]) => logger.debug(`[${component}] ${message}`, ...args),
    warn: (message: string, ...args: any[]) => logger.warn(`[${component}] ${message}`, ...args),
  };
};