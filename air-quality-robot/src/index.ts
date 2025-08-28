import { logger } from './logger.js';
import { config } from './config.js';
import { testConnection, getPendingMissions, markMissionProcessed, markAllExistingMissionsAsProcessed } from './supabase.js';
import { processMission } from './processor.js';

let robotStartTime: string;

async function main() {
  // Initialize robot start time
  logger.info('🤖 Air Quality Robot starting...');
  logger.info(`🔧 DEBUG: process.env.CUTOFF_DATE = "${process.env.CUTOFF_DATE}"`);
  logger.info(`🔧 DEBUG: config.processing.cutoffDate = "${config.processing.cutoffDate}"`);
  
  robotStartTime = config.processing.cutoffDate || new Date().toISOString();
  
  logger.info(`📊 Config: Database=${config.supabase.url}, API=${config.dashboard.endpoint}`);
  logger.info(`🕒 Processing missions created after: ${robotStartTime}`);
  
  // Test connection first
  const connected = await testConnection();
  if (!connected) {
    logger.error('❌ Failed to connect to Supabase. Exiting.');
    process.exit(1);
  }

  // Mark existing missions as processed if requested
  if (config.processing.markExistingAsProcessed) {
    logger.info('🔄 Marking existing missions as processed...');
    const markedCount = await markAllExistingMissionsAsProcessed(robotStartTime);
    logger.info(`✅ Marked ${markedCount} existing missions as processed`);
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
    logger.info('💓 Air Quality Robot heartbeat...');
  }, 60000); // Every minute
}

async function processOnce() {
  try {
    logger.info('🔍 Checking for pending missions...');
    
    const missions = await getPendingMissions(robotStartTime);
    if (missions.length === 0) {
      logger.info('📭 No new pending missions found');
      return;
    }

    logger.info(`📥 Found ${missions.length} new pending missions to process`);
    
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
  logger.info('👋 Air Quality Robot shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('👋 Air Quality Robot terminating...');
  process.exit(0);
});

main().catch(error => {
  logger.error('💥 Failed to start Air Quality Robot:', error);
  process.exit(1);
});
