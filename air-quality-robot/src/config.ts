export const config = {
  supabase: {
    url: process.env.SUPABASE_URL || 'https://shydpfwuvnlzdzbubmgb.supabase.co',
    key: process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoeWRwZnd1dm5semR6YnVibWdiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTk3MzUyNywiZXhwIjoyMDY3NTQ5NTI3fQ.CIDJaVzr8AxhqQm3IJ8pMHzJGQp_PF2K6jRk3ZGVm5Q'
  },
  dashboard: {
    endpoint: process.env.DASHBOARD_ENDPOINT || 'https://api.atm.ovh/api/v3.0/measurements',
    bearer: process.env.DASHBOARD_BEARER || 'xjb0qzdnefgurhkdps4qivp8x6lq2h66'
  },
  polling: {
    intervalMs: parseInt(process.env.POLL_INTERVAL_MS || '300000') // 5 minutes default
  },
  device: {
    allowedDeviceIds: process.env.ALLOW_DEVICE_IDS ? process.env.ALLOW_DEVICE_IDS.split(',') : [],
    unknownDeviceBehavior: process.env.UNKNOWN_DEVICE_BEHAVIOR || 'skip'
  },
  processing: {
    // Only process missions created after this date (ISO string)
    // If not set, uses robot startup time
    cutoffDate: process.env.CUTOFF_DATE || null,
    // Whether to mark all existing missions as processed on startup
    markExistingAsProcessed: process.env.MARK_EXISTING_PROCESSED === 'true'
  }
};