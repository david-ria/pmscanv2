import { z } from 'zod';

// Environment Variable Schema Definition using Zod
const EnvSchema = z.object({
  // Supabase Configuration
  SUPABASE_URL: z.string().url().min(1),
  SUPABASE_KEY: z.string().min(1),

  // Dashboard API Configuration
  DASHBOARD_ENDPOINT: z.string().url().min(1),
  DASHBOARD_BEARER: z.string().min(1),

  // Server Configuration
  PORT: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1).max(65535)).default('3000'),

  // Database Polling Configuration
  POLL_INTERVAL_MS: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1000)).default('300000'), // 5 minutes
  RATE_MAX_RPS: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1)).default('20'),

  // Processing Configuration
  MAX_ATTEMPTS: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1)).default('6'),
  BATCH_SIZE: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1)).default('200'),

  // Retry Configuration
  RETRY_DELAY_MS: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(100)).default('1000'),
  RETRY_BACKOFF_MULTIPLIER: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1)).default('2'),
  RETRY_TIMEOUT_MS: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1000)).default('30000'),
  MAX_CONCURRENT_REQUESTS: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1)).default('5'),

  // Metrics Configuration
  INCLUDE_METRICS: z.string().min(1).default('pm1,pm25,pm10,latitude,longitude'),
  UNITS_JSON: z.string().min(2).default('{"pm1":"ugm3","pm25":"ugm3","pm10":"ugm3","latitude":"degrees","longitude":"degrees"}'),

  // Device Configuration
  ALLOW_DEVICE_IDS: z.string().min(1).default('PMScan3376DF'),
  UNKNOWN_DEVICE_BEHAVIOR: z.enum(['skip', 'process']).default('skip'),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

// Strongly-typed configuration interface derived from environment validation
export interface Config {
  supabase: {
    url: string;
    key: string;
  };
  dashboard: {
    endpoint: string;
    bearer: string;
  };
  server: {
    port: number;
  };
  polling: {
    intervalMs: number;
    maxRps: number;
  };
  rateLimiting: {
    maxRequestsPerSecond: number;
    maxConcurrentRequests: number;
  };
  retry: {
    maxRetries: number;
    delayMs: number;
    backoffMultiplier: number;
    timeoutMs: number;
  };
  processing: {
    maxAttempts: number;
    batchSize: number;
    includeMetrics: string[];
    units: Record<string, string>;
    allowDeviceIds?: string[];
    unknownDeviceBehavior: 'skip' | 'process';
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
  };
}

// Configuration Schema for final validation
const ConfigSchema = z.object({
  supabase: z.object({
    url: z.string().url(),
    key: z.string().min(1),
  }),
  dashboard: z.object({
    endpoint: z.string().url(),
    bearer: z.string().min(1),
  }),
  server: z.object({
    port: z.number().min(1).max(65535),
  }),
  polling: z.object({
    intervalMs: z.number().min(1000),
    maxRps: z.number().min(1),
  }),
  rateLimiting: z.object({
    maxRequestsPerSecond: z.number().min(1),
    maxConcurrentRequests: z.number().min(1),
  }),
  retry: z.object({
    maxRetries: z.number().min(1),
    delayMs: z.number().min(100),
    backoffMultiplier: z.number().min(1),
    timeoutMs: z.number().min(1000),
  }),
  processing: z.object({
    maxAttempts: z.number().min(1),
    batchSize: z.number().min(1),
    includeMetrics: z.array(z.string()),
    units: z.record(z.string()),
    allowDeviceIds: z.array(z.string()).optional(),
    unknownDeviceBehavior: z.enum(['skip', 'process']),
  }),
  logging: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']),
  }),
});

// Error formatting function
function formatValidationError(error: z.ZodError): string {
  const missingRequired = [];
  const invalidValues = [];
  
  for (const issue of error.issues) {
    const path = issue.path.join('.');
    
    if (issue.code === 'invalid_type' && issue.received === 'undefined') {
      missingRequired.push(`❌ MISSING: ${path} is required`);
    } else {
      invalidValues.push(`❌ INVALID: ${path} - ${issue.message}`);
    }
  }
  
  let errorMessage = '\n🚨 CONFIGURATION ERROR - Pull Robot cannot start!\n\n';
  
  if (missingRequired.length > 0) {
    errorMessage += '📋 MISSING REQUIRED ENVIRONMENT VARIABLES:\n';
    errorMessage += missingRequired.join('\n') + '\n\n';
  }
  
  if (invalidValues.length > 0) {
    errorMessage += '⚠️  INVALID ENVIRONMENT VARIABLES:\n';
    errorMessage += invalidValues.join('\n') + '\n\n';
  }
  
  errorMessage += '💡 FIX: Check your .env file and ensure all required variables are set.\n';
  errorMessage += '📖 See .env.example for correct format and default values.\n';
  
  return errorMessage;
}

function loadConfig(): Config {
  try {
    console.log('🔧 Loading and validating configuration...');
    
    // Parse and validate environment variables with detailed error reporting
    const env = EnvSchema.parse(process.env);
    
    console.log('✅ Environment validation passed');

    // Transform and structure the configuration
    const transformedConfig: Config = {
      supabase: {
        url: env.SUPABASE_URL,
        key: env.SUPABASE_KEY,
      },
      dashboard: {
        endpoint: env.DASHBOARD_ENDPOINT,
        bearer: env.DASHBOARD_BEARER,
      },
      server: {
        port: env.PORT,
      },
      polling: {
        intervalMs: env.POLL_INTERVAL_MS,
        maxRps: env.RATE_MAX_RPS,
      },
      rateLimiting: {
        maxRequestsPerSecond: env.RATE_MAX_RPS,
        maxConcurrentRequests: env.MAX_CONCURRENT_REQUESTS,
      },
      retry: {
        maxRetries: env.MAX_ATTEMPTS,
        delayMs: env.RETRY_DELAY_MS,
        backoffMultiplier: env.RETRY_BACKOFF_MULTIPLIER,
        timeoutMs: env.RETRY_TIMEOUT_MS,
      },
      processing: {
        maxAttempts: env.MAX_ATTEMPTS,
        batchSize: env.BATCH_SIZE,
        includeMetrics: env.INCLUDE_METRICS.split(',').map(s => s.trim()),
        units: JSON.parse(env.UNITS_JSON),
        allowDeviceIds: env.ALLOW_DEVICE_IDS ? env.ALLOW_DEVICE_IDS.split(',').map(s => s.trim()) : undefined,
        unknownDeviceBehavior: env.UNKNOWN_DEVICE_BEHAVIOR,
      },
      logging: {
        level: env.LOG_LEVEL,
      },
    };

    // Log loaded configuration (excluding sensitive data)
    console.log('📋 Configuration loaded successfully:', {
      supabase: {
        url: transformedConfig.supabase.url,
      },
      dashboard: {
        endpoint: transformedConfig.dashboard.endpoint,
        bearer: `${transformedConfig.dashboard.bearer.substring(0, 8)}...`,
      },
      server: transformedConfig.server,
      polling: transformedConfig.polling,
      processing: {
        ...transformedConfig.processing,
        units: Object.keys(transformedConfig.processing.units),
      },
      logging: transformedConfig.logging,
    });

    // Final validation against the Config schema
    return ConfigSchema.parse(transformedConfig);

  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedError = formatValidationError(error);
      console.error(formattedError);
    } else {
      console.error('💥 Unexpected configuration error:', error);
    }
    
    // Exit with non-zero code to indicate failure
    process.exit(1);
  }
}

export const config = loadConfig();