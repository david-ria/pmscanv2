/**
 * Consolidated logger utility for the application
 * - In development: All log levels are shown
 * - In production: Only warn/error are shown, debug/info/log are suppressed
 * - Provides rate-limited logging to prevent console spam
 */

// Check environment
const isProduction = import.meta.env.PROD;
const isDevelopment = import.meta.env.DEV;

// Rate limiting state
const lastLogTimes: Record<string, number> = {};
const logCounts: Record<string, number> = {};

/**
 * Debug level logging - suppressed in production
 */
export const debug = (message: string, ...args: unknown[]) => {
  if (!isProduction && isDevelopment) {
    console.debug(`[DEBUG] ${message}`, ...args);
  }
};

/**
 * Info level logging - suppressed in production
 */
export const info = (message: string, ...args: unknown[]) => {
  if (!isProduction && isDevelopment) {
    console.info(`[INFO] ${message}`, ...args);
  }
};

/**
 * Alias for debug - for easy console.log replacement
 */
export const log = debug;

/**
 * Warning level logging - always shown
 */
export const warn = (message: string, ...args: unknown[]) => {
  console.warn(`[WARN] ${message}`, ...args);
};

/**
 * Error level logging - always shown
 */
export const error = (message: string, err?: Error | unknown, ...args: unknown[]) => {
  console.error(`[ERROR] ${message}`, err, ...args);
};

/**
 * Rate-limited debug logging - prevents console spam from high-frequency operations
 * @param key - Unique key for rate limiting this specific log
 * @param intervalMs - Minimum time between logs in milliseconds
 * @param message - Log message
 * @param args - Additional arguments
 */
export function rateLimitedDebug(
  key: string,
  intervalMs: number,
  message: string,
  ...args: unknown[]
) {
  if (isProduction) return;
  
  const now = Date.now();
  const last = lastLogTimes[key] ?? 0;
  
  if (now - last >= intervalMs) {
    const suppressedCount = logCounts[key] || 0;
    lastLogTimes[key] = now;
    logCounts[key] = 0;
    
    if (suppressedCount > 0) {
      console.debug(`[DEBUG] ${message} (${suppressedCount} similar logs suppressed)`, ...args);
    } else {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  } else {
    logCounts[key] = (logCounts[key] || 0) + 1;
  }
}

/**
 * Rate-limited info logging
 */
export function rateLimitedInfo(
  key: string,
  intervalMs: number,
  message: string,
  ...args: unknown[]
) {
  if (isProduction) return;
  
  const now = Date.now();
  const last = lastLogTimes[key] ?? 0;
  
  if (now - last >= intervalMs) {
    lastLogTimes[key] = now;
    console.info(`[INFO] ${message}`, ...args);
  }
}

/**
 * Rate-limited warn logging (shown in production too, but rate-limited)
 */
export function rateLimitedWarn(
  key: string,
  intervalMs: number,
  message: string,
  ...args: unknown[]
) {
  const now = Date.now();
  const last = lastLogTimes[key] ?? 0;
  
  if (now - last >= intervalMs) {
    lastLogTimes[key] = now;
    console.warn(`[WARN] ${message}`, ...args);
  }
}

/**
 * Performance timing - development only
 */
export const time = (label: string) => {
  if (!isProduction) {
    console.time(`[PERF] ${label}`);
  }
};

export const timeEnd = (label: string) => {
  if (!isProduction) {
    console.timeEnd(`[PERF] ${label}`);
  }
};

/**
 * Get current log level
 */
export const getLogLevel = () => {
  if (isProduction) return 'warn';
  return 'debug';
};

/**
 * Check if a log level is enabled
 */
export const isLogLevelEnabled = (level: 'debug' | 'info' | 'warn' | 'error') => {
  if (isProduction) {
    return level === 'warn' || level === 'error';
  }
  return true;
};

/**
 * Development-only logger with conditional execution
 */
export const devLogger = {
  debug: (message: string, ...args: unknown[]) => {
    if (!isProduction) {
      debug(message, ...args);
    }
  },
  info: (message: string, ...args: unknown[]) => {
    if (!isProduction) {
      info(message, ...args);
    }
  },
  performance: (label: string, fn: () => void) => {
    if (!isProduction) {
      time(label);
      fn();
      timeEnd(label);
    } else {
      fn();
    }
  },
};

// Default export for convenience
export default { 
  debug, 
  info, 
  log,
  warn, 
  error, 
  rateLimitedDebug, 
  rateLimitedInfo,
  rateLimitedWarn,
  time,
  timeEnd,
  getLogLevel, 
  isLogLevelEnabled,
  devLogger
};
