// Production-safe logger that sends critical errors to monitoring
// Replaces console logging in production with structured error reporting

interface ErrorReport {
  message: string;
  error?: Error;
  context?: Record<string, unknown>;
  timestamp: string;
  userAgent: string;
  url: string;
}

class ProductionLogger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  // Only log warnings and errors in production
  warn(message: string, ...args: unknown[]): void {
    console.warn(`[WARN] ${message}`, ...args);
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    console.error(`[ERROR] ${message}`, error);
    
    // Send to monitoring service in production
    if (!this.isDevelopment) {
      this.sendErrorReport({
        message,
        error,
        context,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      }).catch(() => {
        // Silent failure - don't spam console if error reporting fails
      });
    }
  }

  private async sendErrorReport(report: ErrorReport): Promise<void> {
    try {
      // Send to your monitoring service (e.g., Sentry, LogRocket, etc.)
      await fetch('/api/error-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(report),
      });
    } catch {
      // Silent failure - avoid recursive error reporting
    }
  }

  // Development-only methods (stripped in production build)
  debug(message: string, ...args: unknown[]): void {
    if (this.isDevelopment) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.isDevelopment) {
      console.info(`[INFO] ${message}`, ...args);
    }
  }

  // Performance tracking for production
  time(label: string): void {
    if (this.isDevelopment) {
      console.time(label);
    }
  }

  timeEnd(label: string): void {
    if (this.isDevelopment) {
      console.timeEnd(label);
    }
  }

  // Rate-limited logging for high-frequency operations
  rateLimitedError(
    key: string,
    intervalMs: number,
    message: string,
    error?: Error,
    context?: Record<string, unknown>
  ): void {
    const lastLogTime = this.lastErrorLogs.get(key) || 0;
    const now = Date.now();

    if (now - lastLogTime >= intervalMs) {
      this.error(message, error, context);
      this.lastErrorLogs.set(key, now);
    }
  }

  private lastErrorLogs = new Map<string, number>();
}

// Global instance
export const productionLogger = new ProductionLogger();

// Convenience exports
export const { warn, error, debug, info, time, timeEnd } = productionLogger;
export const rateLimitedError = productionLogger.rateLimitedError.bind(productionLogger);

// Development-only logger that's completely stripped in production
export const devOnly = {
  log: (message: string, ...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV] ${message}`, ...args);
    }
  },
  debug: (message: string, ...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEV] ${message}`, ...args);
    }
  },
  info: (message: string, ...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.info(`[DEV] ${message}`, ...args);
    }
  },
  performance: (label: string, fn: () => void) => {
    if (process.env.NODE_ENV === 'development') {
      console.time(label);
      fn();
      console.timeEnd(label);
    } else {
      fn();
    }
  },
};