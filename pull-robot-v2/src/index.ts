import { logger } from './logger.js';
import { config } from './config.js';
import { testConnection, getPendingMissions, markMissionProcessed } from './supabase.js';
import { processMission } from './processor.js';

async function main() {
  logger.info('🤖 Pull Robot v2 starting...');
  logger.info(`📊 Config: Database=${config.supabase.url}, API=${config.dashboard.endpoint}`);
  
  // Test connection first
  const connected = await testConnection();
  if (!connected) {
    logger.error('❌ Failed to connect to Supabase. Exiting.');
    process.exit(1);
  }

  // Start processing loop
  logger.info(`🔄 Starting processing loop (interval: ${config.polling.intervalMs}ms)`);
  
  // Process immediately on startup
  await processOnce();
  
  // Then set up interval
  setInterval(async () => {
    await processOnce();
  }, config.polling.intervalMs);
  
  // Keep alive
  setInterval(() => {
    logger.info('💓 Pull Robot v2 heartbeat...');
  }, 60000); // Every minute
}

async function processOnce() {
  try {
    logger.info('🔍 Checking for pending missions...');
    
    const missions = await getPendingMissions();
    if (missions.length === 0) {
      logger.info('📭 No pending missions found');
      return;
    }

    logger.info(`📥 Found ${missions.length} pending missions to process`);
    
    let processed = 0;
    for (const mission of missions) {
      const success = await processMission(mission);
      if (success) {
        await markMissionProcessed(mission.id);
        processed++;
      } else {
        logger.warn(`⚠️ Failed to process mission ${mission.id}, will retry later`);
      }
    }
    
    logger.info(`✅ Processing complete: ${processed}/${missions.length} missions processed successfully`);
  } catch (error) {
    logger.error('💥 Error in processing cycle:', error);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('👋 Pull Robot v2 shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('👋 Pull Robot v2 terminating...');
  process.exit(0);
});

main().catch(error => {
  logger.error('💥 Failed to start Pull Robot v2:', error);
  process.exit(1);
});
