import { safeJson } from '@/utils/safeJson';

/**
 * Enhanced logger utility that maintains compatibility with existing logging
 * while providing structured logging for production environments
 */

// Check if we're in production mode
const isProduction = import.meta.env.PROD;
const isDevelopment = import.meta.env.DEV;

// Rate-limited logging for development
const lastLogTimes: Record<string, number> = {};

// Simple logger interface that mirrors console methods
export const debug = (message: string, ...args: any[]) => {
  // Suppress debug logs in production
  if (!isProduction && isDevelopment) {
    console.debug(`[DEBUG] ${message}`, ...args);
  }
};

export const info = (message: string, ...args: any[]) => {
  // Suppress info logs in production
  if (!isProduction && isDevelopment) {
    console.info(`[INFO] ${message}`, ...args);
  }
};

export const warn = (message: string, ...args: any[]) => {
  console.warn(`[WARN] ${message}`, ...args);
};

export const error = (message: string, error?: Error, ...args: any[]) => {
  console.error(`[ERROR] ${message}`, error, ...args);
  
  // In production, you could send to monitoring service here
  if (isProduction && typeof window !== 'undefined') {
    // Send to monitoring service with error handling
    try {
      fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: 'error',
          message,
          error: error?.message,
          stack: error?.stack,
          timestamp: new Date().toISOString(),
          url: window.location.href
        })
      }).then(async (response) => {
        if (response.ok) {
          const result = await safeJson(response);
          if (result) {
            console.debug('Log sent successfully');
          }
        }
      }).catch(() => {
        // Silently fail - logging should never break the app
      });
    } catch {
      // Silently fail
    }
  }
};

export function rateLimitedDebug(
  key: string,
  intervalMs: number,
  ...args: unknown[]
) {
  if (isProduction) return; // Suppress in production
  const now = Date.now();
  const last = lastLogTimes[key] ?? 0;
  if (now - last >= intervalMs) {
    lastLogTimes[key] = now;
    console.debug(...args);
  }
}

// Development logger object for compatibility - MUST be named export for namespace imports
export const devLogger = {
  debug: (message: string, ...args: any[]) => debug(message, ...args),
  info: (message: string, ...args: any[]) => info(message, ...args),
  performance: (label: string, fn: () => void) => {
    if (!isProduction && isDevelopment) {
      console.time(label);
      fn();
      console.timeEnd(label);
    } else {
      fn();
    }
  },
};

// Utility to check current log level
export const getLogLevel = () => {
  if (isProduction) return 'warn'; // Only warn/error in production
  return 'debug'; // All levels in development
};

// Utility to check if a log level is enabled
export const isLogLevelEnabled = (level: 'debug' | 'info' | 'warn' | 'error') => {
  if (isProduction) {
    return level === 'warn' || level === 'error';
  }
  return true; // All levels enabled in development
};

// Named exports for namespace imports (no default export to avoid conflicts)
// This ensures import * as logger from '@/utils/logger' works correctly