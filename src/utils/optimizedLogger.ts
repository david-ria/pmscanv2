// Production-ready logger with performance optimization
// Replaces console.debug/log/warn with optimized logging

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  level: LogLevel;
  enableInProduction: boolean;
  prefix: string;
  enablePerformanceTracking: boolean;
}

class OptimizedLogger {
  private config: LoggerConfig;
  private logCounts = new Map<string, number>();
  private lastLogTime = new Map<string, number>();

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: 'warn',
      enableInProduction: false,
      prefix: '[APP]',
      enablePerformanceTracking: true,
      ...config,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };

    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (!isDevelopment && !this.config.enableInProduction) {
      return level === 'error'; // Only errors in production
    }

    return levels[level] >= levels[this.config.level];
  }

  private formatMessage(level: LogLevel, message: string, ...args: any[]): any[] {
    const timestamp = new Date().toISOString();
    const formattedMessage = `${this.config.prefix} [${level.toUpperCase()}] ${timestamp} ${message}`;
    return [formattedMessage, ...args];
  }

  // Rate-limited logging to prevent console spam
  rateLimitedLog(
    key: string,
    intervalMs: number,
    level: LogLevel,
    message: string,
    ...args: any[]
  ): void {
    if (!this.shouldLog(level)) return;

    const now = Date.now();
    const lastTime = this.lastLogTime.get(key) || 0;

    if (now - lastTime >= intervalMs) {
      const count = this.logCounts.get(key) || 0;
      this.logCounts.set(key, count + 1);
      this.lastLogTime.set(key, now);

      const finalMessage = count > 0 
        ? `${message} (${count} similar messages suppressed)`
        : message;

      this.log(level, finalMessage, ...args);
      this.logCounts.set(key, 0);
    } else {
      this.logCounts.set(key, (this.logCounts.get(key) || 0) + 1);
    }
  }

  private log(level: LogLevel, message: string, ...args: any[]): void {
    if (!this.shouldLog(level)) return;

    const formattedArgs = this.formatMessage(level, message, ...args);

    switch (level) {
      case 'debug':
        console.debug(...formattedArgs);
        break;
      case 'info':
        console.info(...formattedArgs);
        break;
      case 'warn':
        console.warn(...formattedArgs);
        break;
      case 'error':
        console.error(...formattedArgs);
        break;
    }
  }

  // Public logging methods
  debug(message: string, ...args: any[]): void {
    this.log('debug', message, ...args);
  }

  info(message: string, ...args: any[]): void {
    this.log('info', message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.log('warn', message, ...args);
  }

  error(message: string, ...args: any[]): void {
    this.log('error', message, ...args);
  }

  // Performance tracking
  time(label: string): void {
    if (this.config.enablePerformanceTracking) {
      console.time(`${this.config.prefix} ${label}`);
    }
  }

  timeEnd(label: string): void {
    if (this.config.enablePerformanceTracking) {
      console.timeEnd(`${this.config.prefix} ${label}`);
    }
  }

  // Rate-limited variants
  rateLimitedDebug(key: string, intervalMs: number, message: string, ...args: any[]): void {
    this.rateLimitedLog(key, intervalMs, 'debug', message, ...args);
  }

  rateLimitedInfo(key: string, intervalMs: number, message: string, ...args: any[]): void {
    this.rateLimitedLog(key, intervalMs, 'info', message, ...args);
  }

  rateLimitedWarn(key: string, intervalMs: number, message: string, ...args: any[]): void {
    this.rateLimitedLog(key, intervalMs, 'warn', message, ...args);
  }
}

// Global logger instance
export const logger = new OptimizedLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'warn',
  enableInProduction: false,
  prefix: '[AirSentinels]',
  enablePerformanceTracking: process.env.NODE_ENV === 'development',
});

// Convenience exports - properly bound methods
export const debug = logger.debug.bind(logger);
export const info = logger.info.bind(logger);
export const warn = logger.warn.bind(logger);
export const error = logger.error.bind(logger);
export const time = logger.time.bind(logger);
export const timeEnd = logger.timeEnd.bind(logger);
export const rateLimitedDebug = logger.rateLimitedDebug.bind(logger);
export const rateLimitedInfo = logger.rateLimitedInfo.bind(logger);
export const rateLimitedWarn = logger.rateLimitedWarn.bind(logger);

// Development-only logger
export const devLogger = {
  debug: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      logger.debug(message, ...args);
    }
  },
  info: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      logger.info(message, ...args);
    }
  },
  performance: (label: string, fn: () => void) => {
    if (process.env.NODE_ENV === 'development') {
      logger.time(label);
      fn();
      logger.timeEnd(label);
    } else {
      fn();
    }
  },
};

console.debug('[PERF] 🚀 Optimized logger initialized');