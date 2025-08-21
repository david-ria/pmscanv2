import { z } from 'zod';
import { ConfigSchema, type Config } from './types.js';

const EnvSchema = z.object({
  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string(),
  
  // Storage
  STORAGE_BUCKET: z.string(),
  CSV_PATH_PREFIX: z.string().default('exports/'),
  
  // API
  DASHBOARD_API_URL: z.string().url(),
  DASHBOARD_API_KEY: z.string(),
  
  // Rate limiting
  MAX_REQUESTS_PER_SECOND: z.coerce.number().default(10),
  MAX_CONCURRENT_REQUESTS: z.coerce.number().default(5),
  
  // Polling
  POLL_INTERVAL_MS: z.coerce.number().default(60000),
  PROCESS_BATCH_SIZE: z.coerce.number().default(100),
  
  // Retry
  MAX_RETRIES: z.coerce.number().default(3),
  RETRY_DELAY_MS: z.coerce.number().default(1000),
  BACKOFF_MULTIPLIER: z.coerce.number().default(2),
  
  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  
  // Health
  HEALTH_PORT: z.coerce.number().default(3000),
  
  // Database
  SQLITE_PATH: z.string().default('./data/robot-state.db'),
  
  // Sensor mapping
  SENSOR_MAP_PATH: z.string().default('./data/sensor_map.csv'),
});

function loadConfig(): Config {
  try {
    // Parse environment variables
    const env = EnvSchema.parse(process.env);
    
    // Transform to config structure
    const config: Config = {
      supabase: {
        url: env.SUPABASE_URL,
        anonKey: env.SUPABASE_ANON_KEY,
      },
      storage: {
        bucket: env.STORAGE_BUCKET,
        pathPrefix: env.CSV_PATH_PREFIX,
      },
      api: {
        url: env.DASHBOARD_API_URL,
        key: env.DASHBOARD_API_KEY,
      },
      rateLimiting: {
        maxRequestsPerSecond: env.MAX_REQUESTS_PER_SECOND,
        maxConcurrentRequests: env.MAX_CONCURRENT_REQUESTS,
      },
      polling: {
        intervalMs: env.POLL_INTERVAL_MS,
        batchSize: env.PROCESS_BATCH_SIZE,
      },
      retry: {
        maxRetries: env.MAX_RETRIES,
        delayMs: env.RETRY_DELAY_MS,
        backoffMultiplier: env.BACKOFF_MULTIPLIER,
      },
      logging: {
        level: env.LOG_LEVEL,
      },
      health: {
        port: env.HEALTH_PORT,
      },
      database: {
        path: env.SQLITE_PATH,
      },
      sensorMap: {
        path: env.SENSOR_MAP_PATH,
      },
    };
    
    // Validate final config
    return ConfigSchema.parse(config);
  } catch (error) {
    console.error('Configuration error:', error);
    process.exit(1);
  }
}

export const config = loadConfig();