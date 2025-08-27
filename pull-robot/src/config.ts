export const config = {
  supabase: {
    url: process.env.SUPABASE_URL || 'https://shydpfwuvnlzdzbubmgb.supabase.co',
    key: process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoeWRwZnd1dm5semR6YnVibWdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5NzM1MjcsImV4cCI6MjA2NzU0OTUyN30.l_PAPBy1hlb4J-amKx7qPJ1lPIFseA9GznwL6CcyaQQ'
  },
  dashboard: {
    endpoint: process.env.DASHBOARD_ENDPOINT || 'https://api.atm.ovh/api/v3.0/measurements',
    bearer: process.env.DASHBOARD_BEARER || 'xjb0qzdnefgurhkdps4qivp8x6lq2h66'
  },
  polling: {
    intervalMs: parseInt(process.env.POLL_INTERVAL_MS || '300000') // 5 minutes default
  }
};