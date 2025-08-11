/**
 * Enhanced logger utility that maintains compatibility with existing logging
 * while providing structured logging for production environments
 */

// Simple logger interface that mirrors console methods
export const debug = (message: string, ...args: any[]) => {
  if (import.meta.env.DEV) {
    console.debug(`[DEBUG] ${message}`, ...args);
  }
};

export const info = (message: string, ...args: any[]) => {
  console.info(`[INFO] ${message}`, ...args);
};

export const warn = (message: string, ...args: any[]) => {
  console.warn(`[WARN] ${message}`, ...args);
};

export const error = (message: string, error?: Error, ...args: any[]) => {
  console.error(`[ERROR] ${message}`, error, ...args);
  
  // In production, you could send to monitoring service here
  if (!import.meta.env.DEV && typeof window !== 'undefined') {
    // Send to monitoring service
    try {
      fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: 'error',
          message,
          error: error?.message,
          stack: error?.stack,
          timestamp: Date.now(), // Use epoch ms for logging
          url: window.location.href
        })
      }).catch(() => {
        // Silently fail
      });
    } catch {
      // Silently fail
    }
  }
};

// Rate-limited logging for development
const lastLogTimes: Record<string, number> = {};

export function rateLimitedDebug(
  key: string,
  intervalMs: number,
  ...args: unknown[]
) {
  if (!import.meta.env.DEV) return;
  const now = Date.now();
  const last = lastLogTimes[key] ?? 0;
  if (now - last >= intervalMs) {
    lastLogTimes[key] = now;
    console.debug(...args);
  }
}

export default { debug, info, warn, error, rateLimitedDebug };