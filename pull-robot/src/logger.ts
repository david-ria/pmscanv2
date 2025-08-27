// Simple console logger that works everywhere
export const logger = {
  info: (message: string, data?: any) => {
    if (data) {
      console.log(`[INFO] ${message}`, JSON.stringify(data, null, 2));
    } else {
      console.log(`[INFO] ${message}`);
    }
  },
  error: (message: string, data?: any) => {
    if (data) {
      console.error(`[ERROR] ${message}`, JSON.stringify(data, null, 2));
    } else {
      console.error(`[ERROR] ${message}`);
    }
  },
  debug: (message: string, data?: any) => {
    if (process.env.LOG_LEVEL === 'debug') {
      if (data) {
        console.log(`[DEBUG] ${message}`, JSON.stringify(data, null, 2));
      } else {
        console.log(`[DEBUG] ${message}`);
      }
    }
  },
  warn: (message: string, data?: any) => {
    if (data) {
      console.warn(`[WARN] ${message}`, JSON.stringify(data, null, 2));
    } else {
      console.warn(`[WARN] ${message}`);
    }
  }
};