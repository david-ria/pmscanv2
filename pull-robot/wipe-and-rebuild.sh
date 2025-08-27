#!/bin/bash

echo "🧹 COMPLETELY WIPING AND REBUILDING src directory..."

# Remove entire src directory 
rm -rf src/

# Create fresh src directory
mkdir -p src/

# Create minimal logger.ts
cat > src/logger.ts << 'EOF'
export const logger = {
  info: (msg: string, ...args: any[]) => console.log(`[INFO] ${msg}`, ...args),
  error: (msg: string, ...args: any[]) => console.error(`[ERROR] ${msg}`, ...args),
  warn: (msg: string, ...args: any[]) => console.warn(`[WARN] ${msg}`, ...args),
  debug: (msg: string, ...args: any[]) => console.log(`[DEBUG] ${msg}`, ...args)
};
EOF

# Create minimal config.ts
cat > src/config.ts << 'EOF'
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
EOF

# Create minimal index.ts
cat > src/index.ts << 'EOF'
import { logger } from './logger.js';
import { config } from './config.js';

async function main() {
  logger.info('🤖 Pull Robot starting...');
  logger.info(`Database: ${config.supabase.url}`);
  logger.info(`API: ${config.dashboard.endpoint}`);
  
  // Simple test to prove it works
  logger.info('✅ Pull Robot is running! This is a minimal test version.');
  
  // Keep alive
  setInterval(() => {
    logger.info('💓 Pull Robot heartbeat...');
  }, 30000);
}

main().catch(error => {
  logger.error(`Bootstrap failed: ${error.message}`);
  process.exit(1);
});
EOF

echo "✅ Fresh minimal src directory created with 3 files"
echo "📁 Contents of src/:"
ls -la src/
