import { z } from 'zod';
import { logger } from './logger.js';

// Environment variables schema
const EnvSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_KEY: z.string().min(1),
  DASHBOARD_ENDPOINT: z.string().url(),
  DASHBOARD_BEARER: z.string().min(1),
  PORT: z.string().transform(Number).default('3000'),
  POLL_INTERVAL_MS: z.string().transform(Number).default('300000'),
  RATE_MAX_RPS: z.string().transform(Number).default('20'),
  MAX_ATTEMPTS: z.string().transform(Number).default('6'),
  BATCH_SIZE: z.string().transform(Number).default('200'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  ALLOW_DEVICE_IDS: z.string().optional(),
  UNKNOWN_DEVICE_BEHAVIOR: z.enum(['skip', 'process']).default('skip'),
  INCLUDE_METRICS: z.string().default('pm1,pm25,pm10,latitude,longitude'),
  UNITS_JSON: z.string().default('{"pm1":"ugm3","pm25":"ugm3","pm10":"ugm3","latitude":"degrees","longitude":"degrees"}'),
});

// Strongly-typed configuration interface
interface Config {
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
    maxAttempts: number;
    batchSize: number;
  };
  processing: {
    allowDeviceIds?: string[];
    unknownDeviceBehavior: 'skip' | 'process';
    includeMetrics: string[];
    units: Record<string, string>;
  };
  logging: {
    level: 'error' | 'warn' | 'info' | 'debug';
  };
}

// Final configuration schema
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
    port: z.number().int().positive(),
  }),
  polling: z.object({
    intervalMs: z.number().int().positive(),
    maxRps: z.number().int().positive(),
    maxAttempts: z.number().int().positive(),
    batchSize: z.number().int().positive(),
  }),
  processing: z.object({
    allowDeviceIds: z.array(z.string()).optional(),
    unknownDeviceBehavior: z.enum(['skip', 'process']),
    includeMetrics: z.array(z.string()),
    units: z.record(z.string()),
  }),
  logging: z.object({
    level: z.enum(['error', 'warn', 'info', 'debug']),
  }),
});

function formatValidationError(error: z.ZodError): string {
  const issues = error.issues.map(issue => {
    const path = issue.path.join('.');
    return `- ${path}: ${issue.message}`;
  }).join('\n');
  
  return `Configuration validation failed:\n${issues}`;
}

function loadConfig(): Config {
  logger.info('⚙️ Loading configuration from environment variables...');
  
  try {
    // Parse and validate environment variables
    const env = EnvSchema.parse(process.env);
    
    // Parse JSON fields
    const units = JSON.parse(env.UNITS_JSON);
    const includeMetrics = env.INCLUDE_METRICS.split(',').map(m => m.trim());
    const allowDeviceIds = env.ALLOW_DEVICE_IDS ? 
      env.ALLOW_DEVICE_IDS.split(',').map(id => id.trim()) : 
      undefined;
    
    // Build structured configuration
    const config: Config = {
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
        maxAttempts: env.MAX_ATTEMPTS,
        batchSize: env.BATCH_SIZE,
      },
      processing: {
        allowDeviceIds,
        unknownDeviceBehavior: env.UNKNOWN_DEVICE_BEHAVIOR,
        includeMetrics,
        units,
      },
      logging: {
        level: env.LOG_LEVEL,
      },
    };
    
    // Final validation with strongly-typed schema
    const validatedConfig = ConfigSchema.parse(config);
    
    logger.info('✅ Configuration loaded successfully');
    logger.debug('📊 Configuration details:', {
      supabase: { url: validatedConfig.supabase.url },
      dashboard: { endpoint: validatedConfig.dashboard.endpoint },
      polling: validatedConfig.polling,
      processing: {
        ...validatedConfig.processing,
        allowDeviceIds: validatedConfig.processing.allowDeviceIds?.length || 0,
      },
    });
    
    return validatedConfig;
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = formatValidationError(error);
      logger.error('❌ Configuration validation failed:', message);
    } else {
      logger.error('❌ Failed to load configuration:', error);
    }
    
    process.exit(1);
  }
}

export const config = loadConfig();