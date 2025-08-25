import { config } from './config.js';
import { logger } from './logger.js';
import { getPendingMissions, markMissionAsProcessed, getProcessingStats, type PendingMission } from './databasePoller.js';
import { processMissionData, type ATMPayload } from './databaseReader.js';
import { sendToATMAPI } from './poster.js';

// Processing state
let processingInterval: NodeJS.Timeout | null = null;
let isProcessing = false;
let startTime = Date.now();

interface ProcessorStatus {
  active: boolean;
  processing: boolean;
  uptime: number;
  stats: ReturnType<typeof getProcessingStats>;
}

/**
 * Start the database processor
 */
function startDatabaseProcessor(): void {
  if (processingInterval) {
    logger.warn('⚠️ Database processor is already running');
    return;
  }

  logger.info(`🚀 Starting database processor (polling every ${config.polling.intervalMs}ms)`);
  startTime = Date.now();

  // Start processing immediately, then at intervals
  processAndSchedule();
  processingInterval = setInterval(processAndSchedule, config.polling.intervalMs);
}

/**
 * Stop the database processor
 */
function stopDatabaseProcessor(): void {
  if (processingInterval) {
    clearInterval(processingInterval);
    processingInterval = null;
    logger.info('🛑 Database processor stopped');
  }
}

/**
 * Process missions and schedule next run
 */
async function processAndSchedule(): Promise<void> {
  if (isProcessing) {
    logger.debug('⏭️ Skipping processing cycle - already processing');
    return;
  }

  isProcessing = true;
  
  try {
    await processPendingMissions();
  } catch (error) {
    logger.error('💥 Error in processing cycle:', error);
  } finally {
    isProcessing = false;
  }
}

/**
 * Process all pending missions
 */
async function processPendingMissions(): Promise<void> {
  logger.debug('🔍 Checking for pending missions...');
  
  const pendingMissions = await getPendingMissions();
  
  if (pendingMissions.length === 0) {
    logger.debug('📝 No pending missions found');
    return;
  }

  logger.info(`📋 Processing ${pendingMissions.length} pending missions`);

  for (const mission of pendingMissions) {
    await processSingleMission(mission);
  }

  const stats = getProcessingStats();
  logger.info(`✅ Processing cycle complete. Stats: ${JSON.stringify(stats)}`);
}

/**
 * Process a single mission
 */
async function processSingleMission(mission: PendingMission): Promise<void> {
  logger.info(`🔄 Processing mission ${mission.id} (device: ${mission.device_name}, measurements: ${mission.measurements_count})`);
  
  try {
    const payloads = await processMissionData(mission);
    
    if (payloads.length === 0) {
      logger.warn(`⚠️ No payloads generated for mission ${mission.id}`);
      await markMissionAsProcessed(mission.id, false);
      return;
    }

    let successCount = 0;
    
    for (let i = 0; i < payloads.length; i++) {
      const payload = payloads[i];
      const success = await sendPayloadToAPI(payload, mission.id, i + 1);
      
      if (success) {
        successCount++;
      }
    }

    const allSuccessful = successCount === payloads.length;
    
    if (allSuccessful) {
      logger.info(`✅ Mission ${mission.id} completed successfully (${successCount}/${payloads.length} payloads sent)`);
    } else {
      logger.warn(`⚠️ Mission ${mission.id} partially completed (${successCount}/${payloads.length} payloads sent)`);
    }

    await markMissionAsProcessed(mission.id, allSuccessful);
    
  } catch (error) {
    logger.error(`❌ Failed to process mission ${mission.id}:`, error);
    await markMissionAsProcessed(mission.id, false);
  }
}

/**
 * Send payload to API
 */
async function sendPayloadToAPI(payload: ATMPayload, missionId: string, measurementIndex: number): Promise<boolean> {
  return await sendToATMAPI(payload, missionId, measurementIndex);
}

/**
 * Get processor status
 */
function getProcessorStatus(): ProcessorStatus {
  return {
    active: processingInterval !== null,
    processing: isProcessing,
    uptime: Date.now() - startTime,
    stats: getProcessingStats(),
  };
}

export {
  startDatabaseProcessor,
  stopDatabaseProcessor,
  getProcessorStatus,
  type ProcessorStatus,
};