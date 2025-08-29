import { logger } from './logger.js';
import { config } from './config.js';
import { testConnection, getPendingMissions, markMissionProcessed, markAllExistingMissionsAsProcessed } from './supabase.js';
import { processMission } from './processor.js';

let robotStartTime: string;

async function main() {
  logger.info('🤖 ================================');
  logger.info('🤖 AIR QUALITY ROBOT STARTING...');
  logger.info('🤖 ================================');

  // STEP 1: Environment and Configuration Analysis
  logger.info('📋 STEP 1: ENVIRONMENT & CONFIGURATION ANALYSIS');
  logger.info(`🔧 process.env.CUTOFF_DATE = "${process.env.CUTOFF_DATE}"`);
  logger.info(`🔧 config.processing.cutoffDate = "${config.processing.cutoffDate}"`);
  logger.info(`🔧 config.processing.markExistingAsProcessed = ${config.processing.markExistingAsProcessed}`);
  logger.info(`🔧 config.device.allowedDeviceIds = ${JSON.stringify(config.device.allowedDeviceIds)}`);
  logger.info(`🔧 config.device.unknownDeviceBehavior = "${config.device.unknownDeviceBehavior}"`);
  logger.info(`🔧 config.polling.intervalMs = ${config.polling.intervalMs}`);
  logger.info(`🔧 config.supabase.url = "${config.supabase.url}"`);
  logger.info(`🔧 config.supabase.key = "${config.supabase.key.substring(0, 20)}..."`);
  logger.info(`🔧 config.dashboard.endpoint = "${config.dashboard.endpoint}"`);
  logger.info(`🔧 config.dashboard.bearer = "${config.dashboard.bearer.substring(0, 10)}..."`);
  
  // STEP 2: Determine Robot Start Time
  logger.info('🕒 STEP 2: ROBOT START TIME CALCULATION');
  robotStartTime = config.processing.cutoffDate || new Date().toISOString();
  logger.info(`✅ Final robotStartTime = "${robotStartTime}"`);
  logger.info(`📅 Will process missions created AFTER: ${robotStartTime}`);
  
  // STEP 3: Database Connection Test
  logger.info('🔌 STEP 3: DATABASE CONNECTION TEST');
  const connected = await testConnection();
  if (!connected) {
    logger.error('❌ FATAL: Failed to connect to Supabase. Exiting.');
    process.exit(1);
  }
  logger.info('✅ Database connection successful');

  // STEP 4: Mark Existing Missions (if configured)
  logger.info('🔄 STEP 4: EXISTING MISSIONS HANDLING');
  if (config.processing.markExistingAsProcessed) {
    logger.info('🔄 Marking existing missions as processed...');
    const markedCount = await markAllExistingMissionsAsProcessed(robotStartTime);
    logger.info(`✅ Marked ${markedCount} existing missions as processed`);
  } else {
    logger.info('⏭️ Skipping existing missions marking (disabled in config)');
  }

  // STEP 5: Start Processing Loop
  logger.info('🔁 STEP 5: STARTING PROCESSING LOOP');
  logger.info(`🔄 Processing interval: ${config.polling.intervalMs}ms (${config.polling.intervalMs/1000/60} minutes)`);
  
  // Process immediately on startup
  logger.info('🚀 Running initial processing cycle...');
  await processOnce();
  
  // Then set up interval
  setInterval(async () => {
    await processOnce();
  }, config.polling.intervalMs);
  
  // Keep alive heartbeat
  setInterval(() => {
    logger.info('💓 Air Quality Robot heartbeat - system running normally');
  }, 60000); // Every minute

  logger.info('✅ Robot fully initialized and running!');
}

async function processOnce() {
  try {
    logger.info('🔄 ================================');
    logger.info('🔄 PROCESSING CYCLE STARTED');
    logger.info('🔄 ================================');
    
    logger.info('🔍 STEP 1: QUERYING DATABASE FOR PENDING MISSIONS');
    logger.info(`🕒 Using cutoff date: ${robotStartTime}`);
    
    const missions = await getPendingMissions(robotStartTime);
    
    logger.info('🔍 STEP 2: ANALYZING QUERY RESULTS');
    logger.info(`📊 Database returned: ${missions.length} missions`);
    
    if (missions.length === 0) {
      logger.info('📭 No new pending missions found - cycle complete');
      logger.info('🔄 ================================');
      return;
    }

    logger.info('🔄 STEP 3: PROCESSING MISSIONS');
    logger.info(`📥 Found ${missions.length} missions to process:`);
    missions.forEach((mission, index) => {
      logger.info(`  ${index + 1}. Mission ID: ${mission.id}, Device: ${mission.device_name || 'null'}, Created: ${mission.created_at}`);
    });
    
    let processed = 0;
    for (let i = 0; i < missions.length; i++) {
      const mission = missions[i];
      logger.info(`🎯 Processing mission ${i + 1}/${missions.length}: ${mission.id}`);
      
      const success = await processMission(mission);
      if (success) {
        logger.info(`📝 Marking mission ${mission.id} as processed in database...`);
        await markMissionProcessed(mission.id);
        processed++;
        logger.info(`✅ Mission ${mission.id} successfully completed and marked`);
      } else {
        logger.warn(`⚠️ Failed to process mission ${mission.id}, will retry later`);
      }
    }
    
    logger.info('🔄 STEP 4: CYCLE SUMMARY');
    logger.info(`✅ Processing complete: ${processed}/${missions.length} missions processed successfully`);
    logger.info(`📊 Success rate: ${((processed / missions.length) * 100).toFixed(1)}%`);
    logger.info('🔄 ================================');
  } catch (error) {
    logger.error('💥 FATAL ERROR in processing cycle:', error);
    logger.error('🔄 ================================');
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
