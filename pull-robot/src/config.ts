// Simple config loader without complex validation
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
    batchSize: number;
    includeMetrics: string[];
    units: Record<string, string>;
    allowDeviceIds: string[];
  };
}

function loadConfig(): Config {
  const config: Config = {
    supabase: {
      url: process.env.SUPABASE_URL || 'https://shydpfwuvnlzdzbubmgb.supabase.co',
      key: process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoeWRwZnd1dm5semR6YnVibWdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5NzM1MjcsImV4cCI6MjA2NzU0OTUyN30.l_PAPBy1hlb4J-amKx7qPJ1lPIFseA9GznwL6CcyaQQ',
    },
    dashboard: {
      endpoint: process.env.DASHBOARD_ENDPOINT || 'https://api.atm.ovh/api/v3.0/measurements',
      bearer: process.env.DASHBOARD_BEARER || 'xjb0qzdnefgurhkdps4qivp8x6lq2h66',
    },
    server: {
      port: parseInt(process.env.PORT || '3000'),
    },
    polling: {
      intervalMs: parseInt(process.env.POLL_INTERVAL_MS || '300000'),
    },
    rateLimiting: {
      maxRequestsPerSecond: parseInt(process.env.RATE_MAX_RPS || '20'),
      maxConcurrentRequests: parseInt(process.env.MAX_CONCURRENT_REQUESTS || '5'),
    },
    retry: {
      maxRetries: parseInt(process.env.MAX_ATTEMPTS || '6'),
      delayMs: parseInt(process.env.RETRY_DELAY_MS || '1000'),
      backoffMultiplier: parseInt(process.env.RETRY_BACKOFF_MULTIPLIER || '2'),
      timeoutMs: parseInt(process.env.RETRY_TIMEOUT_MS || '30000'),
    },
    processing: {
      batchSize: parseInt(process.env.BATCH_SIZE || '200'),
      includeMetrics: (process.env.INCLUDE_METRICS || 'pm1,pm25,pm10,latitude,longitude').split(',').map(s => s.trim()),
      units: JSON.parse(process.env.UNITS_JSON || '{"pm1":"ugm3","pm25":"ugm3","pm10":"ugm3","latitude":"degrees","longitude":"degrees"}'),
      allowDeviceIds: (process.env.ALLOW_DEVICE_IDS || 'PMScan3376DF').split(',').map(s => s.trim()),
    },
  };

  console.log('✅ Configuration loaded');
  return config;
}

export const config = loadConfig();