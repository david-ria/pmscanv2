/**
 * CRITICAL: Professional Logging System
 * Replaces all console.log statements with structured, configurable logging
 */

import { ErrorSeverity, AppErrorContext } from '@/types';

// === LOG LEVELS ===
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4,
}

// === LOG ENTRY INTERFACE ===
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: AppErrorContext;
  error?: Error;
  data?: Record<string, unknown>;
  component?: string;
  action?: string;
  userId?: string;
  sessionId?: string;
}

// === LOGGER CONFIGURATION ===
export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
  enableStorage: boolean;
  maxStorageEntries: number;
  remoteEndpoint?: string;
  enableThrottling: boolean;
  throttleInterval: number;
}

const defaultConfig: LoggerConfig = {
  level: process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO,
  enableConsole: true,
  enableRemote: false,
  enableStorage: true,
  maxStorageEntries: 1000,
  enableThrottling: true,
  throttleInterval: 2000,
};

// === THROTTLING MECHANISM ===
class LogThrottler {
  private lastLogged = new Map<string, number>();
  private counts = new Map<string, number>();

  shouldLog(key: string, interval: number): boolean {
    const now = Date.now();
    const lastTime = this.lastLogged.get(key) || 0;
    const count = this.counts.get(key) || 0;

    if (now - lastTime > interval) {
      this.lastLogged.set(key, now);
      
      if (count > 1) {
        console.log(`↳ (${count - 1} similar messages throttled)`);
      }
      
      this.counts.set(key, 1);
      return true;
    } else {
      this.counts.set(key, count + 1);
      return false;
    }
  }

  reset(): void {
    this.lastLogged.clear();
    this.counts.clear();
  }
}

// === MAIN LOGGER CLASS ===
class Logger {
  public config: LoggerConfig;
  private throttler: LogThrottler;
  private storage: LogEntry[] = [];
  private sessionId: string;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.throttler = new LogThrottler();
    this.sessionId = crypto.randomUUID();
  }

  // === CORE LOGGING METHODS ===
  debug(message: string, data?: Record<string, unknown>, context?: AppErrorContext): void {
    this.log(LogLevel.DEBUG, message, undefined, data, context);
  }

  info(message: string, data?: Record<string, unknown>, context?: AppErrorContext): void {
    this.log(LogLevel.INFO, message, undefined, data, context);
  }

  warn(message: string, data?: Record<string, unknown>, context?: AppErrorContext): void {
    this.log(LogLevel.WARN, message, undefined, data, context);
  }

  error(message: string, error?: Error, context?: AppErrorContext): void {
    this.log(LogLevel.ERROR, message, error, undefined, context);
  }

  critical(message: string, error?: Error, context?: AppErrorContext): void {
    this.log(LogLevel.CRITICAL, message, error, undefined, context);
  }

  // === SPECIALIZED LOGGING METHODS ===
  performance(action: string, duration: number, context?: AppErrorContext): void {
    this.info(`⚡ Performance: ${action}`, { duration }, context);
  }

  dataFlow(component: string, operation: string, count: number, context?: AppErrorContext): void {
    const key = `${component}-${operation}`;
    if (this.config.enableThrottling && !this.throttler.shouldLog(key, this.config.throttleInterval)) {
      return;
    }
    this.debug(`📊 ${component}: ${operation} (${count} items)`, { count }, context);
  }

  userAction(action: string, data?: Record<string, unknown>, context?: AppErrorContext): void {
    this.info(`👤 User: ${action}`, data, context);
  }

  deviceEvent(device: string, event: string, data?: Record<string, unknown>, context?: AppErrorContext): void {
    this.info(`📱 Device: ${device} - ${event}`, data, context);
  }

  apiCall(method: string, url: string, status: number, duration: number, context?: AppErrorContext): void {
    const level = status >= 400 ? LogLevel.ERROR : LogLevel.DEBUG;
    this.log(level, `🌐 API: ${method} ${url}`, undefined, { status, duration }, context);
  }

  stateChange(component: string, from: string, to: string, context?: AppErrorContext): void {
    this.debug(`🔄 State: ${component} (${from} → ${to})`, { from, to }, context);
  }

  // === COMPONENT-SPECIFIC LOGGERS ===
  createComponentLogger(componentName: string) {
    return {
      debug: (message: string, data?: Record<string, unknown>) => 
        this.debug(`[${componentName}] ${message}`, data, { component: componentName }),
      
      info: (message: string, data?: Record<string, unknown>) => 
        this.info(`[${componentName}] ${message}`, data, { component: componentName }),
      
      warn: (message: string, data?: Record<string, unknown>) => 
        this.warn(`[${componentName}] ${message}`, data, { component: componentName }),
      
      error: (message: string, error?: Error) => 
        this.error(`[${componentName}] ${message}`, error, { component: componentName }),
      
      dataFlow: (operation: string, count: number) => 
        this.dataFlow(componentName, operation, count),
      
      stateChange: (from: string, to: string) => 
        this.stateChange(componentName, from, to),
    };
  }

  // === CORE LOG PROCESSING ===
  private log(
    level: LogLevel,
    message: string,
    error?: Error,
    data?: Record<string, unknown>,
    context?: AppErrorContext
  ): void {
    if (level < this.config.level) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      error,
      data,
      context,
      sessionId: this.sessionId,
    };

    // Store in memory
    if (this.config.enableStorage) {
      this.storage.push(entry);
      if (this.storage.length > this.config.maxStorageEntries) {
        this.storage.shift();
      }
    }

    // Output to console
    if (this.config.enableConsole) {
      this.outputToConsole(entry);
    }

    // Send to remote endpoint
    if (this.config.enableRemote && this.config.remoteEndpoint) {
      this.sendToRemote(entry);
    }
  }

  // === OUTPUT METHODS ===
  private outputToConsole(entry: LogEntry): void {
    const { level, message, error, data, context } = entry;
    const timestamp = entry.timestamp.toISOString();
    
    const formatMessage = () => {
      let formatted = `[${timestamp}] ${message}`;
      
      if (data && Object.keys(data).length > 0) {
        formatted += ` | Data: ${JSON.stringify(data)}`;
      }
      
      if (context && Object.keys(context).length > 0) {
        formatted += ` | Context: ${JSON.stringify(context)}`;
      }
      
      return formatted;
    };

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formatMessage());
        break;
      case LogLevel.INFO:
        console.info(formatMessage());
        break;
      case LogLevel.WARN:
        console.warn(formatMessage());
        break;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        if (error) {
          console.error(formatMessage(), error);
        } else {
          console.error(formatMessage());
        }
        break;
    }
  }

  private async sendToRemote(entry: LogEntry): Promise<void> {
    if (!this.config.remoteEndpoint) return;

    try {
      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...entry,
          error: entry.error ? {
            name: entry.error.name,
            message: entry.error.message,
            stack: entry.error.stack,
          } : undefined,
        }),
      });
    } catch (error) {
      // Silently fail - don't log errors about logging
    }
  }

  // === UTILITY METHODS ===
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  getLevel(): LogLevel {
    return this.config.level;
  }

  getLogs(): LogEntry[] {
    return [...this.storage];
  }

  clearLogs(): void {
    this.storage = [];
    this.throttler.reset();
  }

  exportLogs(): string {
    return JSON.stringify(this.storage, null, 2);
  }

  configure(newConfig: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // === DEVELOPMENT HELPERS ===
  startPerformanceTimer(label: string): () => void {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.performance(label, duration);
    };
  }

  group(label: string, fn: () => void): void {
    if (this.config.enableConsole) {
      console.group(label);
      fn();
      console.groupEnd();
    } else {
      fn();
    }
  }

  table(data: Record<string, unknown>[]): void {
    if (this.config.enableConsole && this.config.level <= LogLevel.DEBUG) {
      console.table(data);
    }
  }
}

// === SINGLETON INSTANCE ===
export const logger = new Logger();

// === CONVENIENCE EXPORTS ===
export const createLogger = (config?: Partial<LoggerConfig>) => new Logger(config);

// === MIGRATION HELPERS ===
export const migrateConsoleLog = (message: string, ...args: unknown[]) => {
  logger.debug(message, { args });
};

export const migrateConsoleWarn = (message: string, ...args: unknown[]) => {
  logger.warn(message, { args });
};

export const migrateConsoleError = (message: string, ...args: unknown[]) => {
  logger.error(message, args[0] instanceof Error ? args[0] : undefined);
};

// === REACT HOOK ===
export const useLogger = (componentName: string) => {
  return logger.createComponentLogger(componentName);
};

// === SETUP FUNCTION ===
export const setupLogging = (config?: Partial<LoggerConfig>) => {
  if (config) {
    logger.configure(config);
  }

  // Setup global error handling integration
  window.addEventListener('error', (event) => {
    logger.critical('Uncaught error', event.error, {
      component: 'Global',
      additionalData: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    logger.critical('Unhandled promise rejection', event.reason instanceof Error ? event.reason : undefined, {
      component: 'Global',
      additionalData: { reason: String(event.reason) },
    });
  });

  logger.info('Professional logging system initialized', {
    level: LogLevel[logger.getLevel()],
    enableConsole: logger.config.enableConsole,
    enableRemote: logger.config.enableRemote,
  });
};