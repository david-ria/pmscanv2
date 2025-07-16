import * as logger from './logger';

/**
 * Professional error handling utilities
 * Provides consistent error handling patterns across the application
 */

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// Specific error classes
export class ValidationError extends AppError {
  constructor(message: string, field?: string, context?: Record<string, any>) {
    super(
      message,
      'VALIDATION_ERROR',
      400,
      true,
      { field, ...context }
    );
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string, context?: Record<string, any>) {
    super(
      `${resource} not found${id ? ` with id: ${id}` : ''}`,
      'NOT_FOUND',
      404,
      true,
      { resource, id, ...context }
    );
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized access', context?: Record<string, any>) {
    super(message, 'UNAUTHORIZED', 401, true, context);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden access', context?: Record<string, any>) {
    super(message, 'FORBIDDEN', 403, true, context);
  }
}

export class NetworkError extends AppError {
  constructor(message: string = 'Network request failed', context?: Record<string, any>) {
    super(message, 'NETWORK_ERROR', 0, true, context);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, operation?: string, context?: Record<string, any>) {
    super(
      message,
      'DATABASE_ERROR',
      500,
      true,
      { operation, ...context }
    );
  }
}

export class ExternalServiceError extends AppError {
  constructor(
    serviceName: string,
    message: string,
    context?: Record<string, any>
  ) {
    super(
      `${serviceName} service error: ${message}`,
      'EXTERNAL_SERVICE_ERROR',
      502,
      true,
      { serviceName, ...context }
    );
  }
}

// Error handling utility functions
export const handleError = (error: unknown, context?: Record<string, any>): AppError => {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    logger.error('Unhandled error', error, context);
    return new AppError(
      error.message,
      'UNKNOWN_ERROR',
      500,
      false,
      { originalError: error.name, ...context }
    );
  }

  logger.error('Unknown error type', undefined, { error, ...context });
  return new AppError(
    'An unknown error occurred',
    'UNKNOWN_ERROR',
    500,
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

// Async error wrapper
export const asyncHandler = <T extends (...args: any[]) => Promise<any>>(
  fn: T
): T => {
  return ((...args: any[]) => {
    return Promise.resolve(fn(...args)).catch((error) => {
      throw handleError(error, { function: fn.name, args });
    });
  }) as T;
};

// React error boundary helper
export const createErrorBoundaryHandler = (componentName: string) => {
  return (error: Error, errorInfo: { componentStack: string }) => {
    logger.error(
      `React Error Boundary caught error in ${componentName}`,
      error,
      {
        component: componentName,
        componentStack: errorInfo.componentStack,
      }
    );
  };
};

// Error recovery strategies
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryableErrors?: string[];
}

export const defaultRetryConfig: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  retryableErrors: ['NETWORK_ERROR', 'EXTERNAL_SERVICE_ERROR'],
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

      // Don't retry if this error type is not retryable
      if (
        finalConfig.retryableErrors &&
        !finalConfig.retryableErrors.includes(lastError.code)
      ) {
        throw lastError;
      }

      // Don't retry on last attempt
      if (attempt === finalConfig.maxAttempts) {
        throw lastError;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        finalConfig.baseDelay * Math.pow(finalConfig.backoffFactor, attempt - 1),
        finalConfig.maxDelay
      );

      logger.warn(`Operation failed, retrying in ${delay}ms`, {
        attempt,
        maxAttempts: finalConfig.maxAttempts,
        error: lastError.message,
      });

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
};

// Circuit breaker pattern
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private readonly failureThreshold: number = 5,
    private readonly recoveryTimeout: number = 60000 // 1 minute
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime < this.recoveryTimeout) {
        throw new AppError(
          'Circuit breaker is OPEN',
          'CIRCUIT_BREAKER_OPEN',
          503
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
      logger.warn('Circuit breaker opened', {
        failures: this.failures,
        threshold: this.failureThreshold,
      });
    }
  }

  getState(): string {
    return this.state;
  }
}