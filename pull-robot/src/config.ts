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
  ALLOW_DEVICE_IDS: z.string().optional().default('PMScan3376DF'),
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

    console.log('📋 Configuration loaded successfully');
    return transformedConfig;

  } catch (error: any) {
    console.error('💥 Configuration error:', error?.message || error);
    process.exit(1);
  }
}

export const config = loadConfig();