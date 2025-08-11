/**
 * CRITICAL: Centralized Error Management System
 * Replaces scattered error handling with consistent, professional patterns
 */

import { APIResponse, AppErrorContext, ErrorSeverity, ErrorLog } from '@/types';
import logger from '@/utils/logger';

// === CUSTOM ERROR CLASSES ===
export class AppError extends Error {
  public readonly code: string;
  public readonly severity: ErrorSeverity;
  public readonly isOperational: boolean;
  public readonly context?: AppErrorContext;
  public readonly timestamp: Date;

  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    severity: ErrorSeverity = 'medium',
    isOperational: boolean = true,
    context?: AppErrorContext
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.severity = severity;
    this.isOperational = isOperational;
    this.context = context;
    this.timestamp = new Date();

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export class ValidationError extends AppError {
  constructor(message: string, field?: string, context?: AppErrorContext) {
    super(message, 'VALIDATION_ERROR', 'low', true, { field, ...context });
  }
}

export class NetworkError extends AppError {
  constructor(message: string = 'Network request failed', context?: AppErrorContext) {
    super(message, 'NETWORK_ERROR', 'medium', true, context);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed', context?: AppErrorContext) {
    super(message, 'AUTH_ERROR', 'high', true, context);
  }
}

export class DeviceError extends AppError {
  constructor(message: string, device?: string, context?: AppErrorContext) {
    super(message, 'DEVICE_ERROR', 'medium', true, { device, ...context });
  }
}

export class DataError extends AppError {
  constructor(message: string, operation?: string, context?: AppErrorContext) {
    super(message, 'DATA_ERROR', 'medium', true, { operation, ...context });
  }
}

// === ERROR HANDLING UTILITIES ===
export const handleError = (error: unknown, context?: AppErrorContext): AppError => {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    logger.error('Unhandled error converted to AppError', error, context);
    return new AppError(
      error.message,
      'CONVERSION_ERROR',
      'medium',
      false,
      { originalName: error.name, ...context }
    );
  }

  logger.error('Unknown error type converted to AppError', undefined, { error, ...context });
  return new AppError(
    'An unknown error occurred',
    'UNKNOWN_ERROR',
    'high',
    false,
    { error: String(error), ...context }
  );
};

export const isOperationalError = (error: Error): boolean => {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
};

// === ASYNC ERROR WRAPPER ===
export const safeAsync = <T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  context?: AppErrorContext
): T => {
  return ((...args: unknown[]) => {
    return Promise.resolve(fn(...args)).catch((error) => {
      throw handleError(error, { function: fn.name, args, ...context });
    });
  }) as T;
};

// === RETRY MECHANISM ===
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryableErrors: string[];
}

export const defaultRetryConfig: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  retryableErrors: ['NETWORK_ERROR', 'DEVICE_ERROR', 'TEMPORARY_ERROR'],
};

export const withRetry = async <T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> => {
  const finalConfig = { ...defaultRetryConfig, ...config };
  let lastError: AppError;

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = handleError(error, { attempt });

      // Don't retry non-retryable errors
      if (!finalConfig.retryableErrors.includes(lastError.code)) {
        throw lastError;
      }

      // Don't retry on last attempt
      if (attempt === finalConfig.maxAttempts) {
        throw lastError;
      }

      // Calculate exponential backoff delay
      const delay = Math.min(
        finalConfig.baseDelay * Math.pow(finalConfig.backoffFactor, attempt - 1),
        finalConfig.maxDelay
      );

      logger.warn(`Retrying operation in ${delay}ms`, {
        attempt,
        maxAttempts: finalConfig.maxAttempts,
        error: lastError.message,
      });

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
};

// === CIRCUIT BREAKER ===
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private readonly failureThreshold: number = 5,
    private readonly recoveryTimeout: number = 60000
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime < this.recoveryTimeout) {
        throw new AppError(
          'Circuit breaker is OPEN - service temporarily unavailable',
          'CIRCUIT_BREAKER_OPEN',
          'high'
        );
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      logger.warn('Circuit breaker opened due to repeated failures', {
        failures: this.failures,
        threshold: this.failureThreshold,
      });
    }
  }

  getState(): string {
    return this.state;
  }

  getStats() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
    };
  }
}

// === ERROR BOUNDARY HELPERS ===
export const createErrorBoundaryHandler = (componentName: string) => {
  return (error: Error, errorInfo: { componentStack: string }) => {
    const appError = handleError(error, {
      component: componentName,
      componentStack: errorInfo.componentStack,
    });

    logger.error(`React Error Boundary caught error in ${componentName}`, appError, {
      severity: appError.severity,
      code: appError.code,
    });

    // Could send to error reporting service here
    return appError;
  };
};

// === API ERROR HANDLING ===
export const handleAPIError = (response: APIResponse, context?: AppErrorContext): never => {
  const error = new AppError(
    response.error || 'API request failed',
    'API_ERROR',
    'medium',
    true,
    context
  );

  logger.error('API Error', error, { response });
  throw error;
};

// === ERROR RECOVERY STRATEGIES ===
export interface RecoveryStrategy {
  canRecover: (error: AppError) => boolean;
  recover: (error: AppError) => Promise<void>;
  description: string;
}

export const createRecoveryStrategies = (): RecoveryStrategy[] => [
  {
    canRecover: (error) => error.code === 'NETWORK_ERROR',
    recover: async () => {
      // Wait for network to be available
      if (!navigator.onLine) {
        await new Promise(resolve => {
          const handler = () => {
            window.removeEventListener('online', handler);
            resolve(void 0);
          };
          window.addEventListener('online', handler);
        });
      }
    },
    description: 'Wait for network connectivity',
  },
  {
    canRecover: (error) => error.code === 'AUTH_ERROR',
    recover: async () => {
      // Attempt to refresh authentication
      // This would integrate with your auth system
      logger.info('Attempting auth recovery');
    },
    description: 'Refresh authentication',
  },
  {
    canRecover: (error) => error.code === 'DEVICE_ERROR',
    recover: async () => {
      // Attempt device reconnection
      logger.info('Attempting device reconnection');
    },
    description: 'Reconnect device',
  },
];

// === ERROR REPORTING ===
export const reportError = async (error: AppError, context?: AppErrorContext): Promise<void> => {
  const errorLog: ErrorLog = {
    id: crypto.randomUUID(),
    message: error.message,
    severity: error.severity,
    context: { ...error.context, ...context },
    timestamp: error.timestamp,
    resolved: false,
  };

  // Log locally
  logger.error('Error reported', error, errorLog);

  // Could send to external error reporting service
  // await sendToErrorReportingService(errorLog);
};

// === GLOBAL ERROR HANDLER ===
export const setupGlobalErrorHandling = (): void => {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = handleError(event.reason, {
      component: 'Global',
      action: 'unhandledrejection',
    });

    reportError(error);
    event.preventDefault(); // Prevent default browser behavior
  });

  // Handle uncaught errors
  window.addEventListener('error', (event) => {
    const error = handleError(event.error, {
      component: 'Global',
      action: 'uncaughtError',
      additionalData: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });

    reportError(error);
  });
};

// === DEVELOPMENT HELPERS ===
export const createDevelopmentErrorHandler = () => {
  if (process.env.NODE_ENV === 'development') {
    return (error: AppError) => {
      console.group(`🚨 ${error.name}: ${error.code}`);
      console.error('Message:', error.message);
      console.error('Severity:', error.severity);
      console.error('Context:', error.context);
      console.error('Stack:', error.stack);
      console.groupEnd();
    };
  }
  return () => {}; // No-op in production
};

export const devErrorHandler = createDevelopmentErrorHandler();