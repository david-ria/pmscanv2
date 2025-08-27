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
