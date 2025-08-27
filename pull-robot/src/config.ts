export const config = {
  supabase: {
    url: 'https://shydpfwuvnlzdzbubmgb.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoeWRwZnd1dm5semR6YnVibWdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5NzM1MjcsImV4cCI6MjA2NzU0OTUyN30.l_PAPBy1hlb4J-amKx7qPJ1lPIFseA9GznwL6CcyaQQ'
  },
  dashboard: {
    endpoint: 'https://api.atm.ovh/api/v3.0/measurements',
    bearer: 'xjb0qzdnefgurhkdps4qivp8x6lq2h66'
  },
  polling: {
    intervalMs: 30000
  }
};