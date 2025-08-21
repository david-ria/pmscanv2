import { z } from 'zod';
import { ConfigSchema, type Config } from './types.js';

// Enhanced environment validation schema with comprehensive guard rails
const EnvSchema = z.object({
  // Supabase Configuration (MANDATORY)
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_KEY: z.string().min(1, 'SUPABASE_KEY is required and cannot be empty'),
  SUPABASE_BUCKET: z.string().min(1, 'SUPABASE_BUCKET is required and cannot be empty'),
  SUPABASE_PREFIX: z.string().default('missions/'),
  
  // Dashboard API (MANDATORY)
  DASHBOARD_ENDPOINT: z.string().url('DASHBOARD_ENDPOINT must be a valid URL'),
  DASHBOARD_BEARER: z.string().min(1, 'DASHBOARD_BEARER is required and cannot be empty'),
  
  // Server Configuration
  PORT: z.coerce.number().default(3000).refine(port => port > 0 && port < 65536, 'PORT must be between 1 and 65535'),
  
  // Database & File Paths
  DB_PATH: z.string().default('/app/data/robot-state.db'),
  SENSOR_MAP_PATH: z.string().default('/app/data/sensor_map.csv'),
  
  // Polling Configuration
  POLL_INTERVAL_MS: z.coerce.number().default(300000).refine(ms => ms >= 10000, 'POLL_INTERVAL_MS must be at least 10 seconds (10000ms)'),
  
  // Rate Limiting
  RATE_MAX_RPS: z.coerce.number().default(20).refine(rps => rps > 0 && rps <= 1000, 'RATE_MAX_RPS must be between 1 and 1000'),
  
  // Retry Configuration
  MAX_ATTEMPTS: z.coerce.number().default(6).refine(attempts => attempts >= 1 && attempts <= 10, 'MAX_ATTEMPTS must be between 1 and 10'),
  
  // Batch Processing (rows per batch, not files)
  BATCH_SIZE: z.coerce.number().default(200).refine(size => size > 0 && size <= 1000, 'BATCH_SIZE must be between 1 and 1000 rows per batch'),
  
  // Metrics Configuration
  INCLUDE_METRICS: z.string().default('pm1,pm25,pm10').refine(
    metrics => {
      const validMetrics = ['pm1', 'pm25', 'pm10', 'temperature', 'humidity'];
      const requestedMetrics = metrics.split(',').map(m => m.trim().toLowerCase());
      return requestedMetrics.every(m => validMetrics.includes(m));
    },
    'INCLUDE_METRICS must be comma-separated list of: pm1, pm25, pm10, temperature, humidity'
  ),
  
  // Units Mapping (JSON string)
  UNITS_JSON: z.string().default('{"pm1":"ugm3","pm25":"ugm3","pm10":"ugm3","temperature":"celsius","humidity":"percent"}').refine(
    unitsStr => {
      try {
        const units = JSON.parse(unitsStr);
        return typeof units === 'object' && units !== null;
      } catch {
        return false;
      }
    },
    'UNITS_JSON must be valid JSON object'
  ),
  
  // Optional Configuration
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  RETRY_DELAY_MS: z.coerce.number().default(1000).refine(ms => ms >= 100, 'RETRY_DELAY_MS must be at least 100ms'),
  BACKOFF_MULTIPLIER: z.coerce.number().default(2).refine(mult => mult >= 1, 'BACKOFF_MULTIPLIER must be at least 1'),
});

// Enhanced error formatting for missing/invalid environment variables
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
    
    // Parse units JSON
    const units = JSON.parse(env.UNITS_JSON);
    const includeMetrics = env.INCLUDE_METRICS.split(',').map(m => m.trim());
    
    // Transform to config structure
    const config: Config = {
      supabase: {
        url: env.SUPABASE_URL,
        anonKey: env.SUPABASE_KEY,
      },
      storage: {
        bucket: env.SUPABASE_BUCKET,
        pathPrefix: env.SUPABASE_PREFIX,
      },
      api: {
        url: env.DASHBOARD_ENDPOINT,
        key: env.DASHBOARD_BEARER,
      },
      rateLimiting: {
        maxRequestsPerSecond: env.RATE_MAX_RPS,
        maxConcurrentRequests: Math.min(env.RATE_MAX_RPS, 50), // Auto-set based on RPS
      },
      polling: {
        intervalMs: env.POLL_INTERVAL_MS,
        batchSize: env.BATCH_SIZE,
      },
      retry: {
        maxRetries: env.MAX_ATTEMPTS - 1, // MAX_ATTEMPTS includes the initial attempt
        delayMs: env.RETRY_DELAY_MS,
        backoffMultiplier: env.BACKOFF_MULTIPLIER,
      },
      logging: {
        level: env.LOG_LEVEL,
      },
      health: {
        port: env.PORT,
      },
      database: {
        path: env.DB_PATH,
      },
      sensorMap: {
        path: env.SENSOR_MAP_PATH,
      },
      // New configuration sections
      metrics: {
        include: includeMetrics,
        units: units,
      },
    };
    
    // Log final configuration (without sensitive data)
    console.log('📋 Configuration loaded:', {
      supabaseUrl: config.supabase.url,
      storageBucket: config.storage.bucket,
      apiUrl: config.api.url,
      port: config.health.port,
      dbPath: config.database.path,
      pollInterval: config.polling.intervalMs,
      maxRPS: config.rateLimiting.maxRequestsPerSecond,
      includeMetrics: config.metrics.include,
    });
    
    // Final validation against the Config schema
    return ConfigSchema.parse(config);
    
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