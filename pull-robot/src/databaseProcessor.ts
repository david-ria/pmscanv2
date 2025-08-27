import { logger } from './logger.js';
import { config } from './config.js';
import { getPendingMissions, markMissionAsProcessed, getProcessingStats, type PendingMission } from './databasePoller.js';
import { processMissionData, type ATMPayload } from './databaseReader.js';
import { postPayload } from './poster.js';

let isProcessing = false;
let pollerHandle: NodeJS.Timeout | null = null;

/**
 * Start the database processor
 */
export function startDatabaseProcessor(): void {
  if (pollerHandle) {
    logger.warn('Database processor already running');
    return;
  }

  logger.info('🤖 Starting database processor...');
  logger.info(`📊 Polling interval: ${config.polling.intervalMs}ms`);
  logger.info(`🎯 Allowed devices: ${config.processing.allowDeviceIds?.join(', ') || 'All devices'}`);
  logger.info(`📦 Batch size: ${config.processing.batchSize}`);

  // Start immediate processing
  void processAndSchedule();

  // Schedule regular processing
  pollerHandle = setInterval(() => {
    void processAndSchedule();
  }, config.polling.intervalMs);

  logger.info('✅ Database processor started successfully');
}

/**
 * Stop the database processor
 */
export function stopDatabaseProcessor(): void {
  if (pollerHandle) {
    clearInterval(pollerHandle);
    pollerHandle = null;
    logger.info('🛑 Database processor stopped');
  }
}

/**
 * Process missions and schedule next run
 */
async function processAndSchedule(): Promise<void> {
  if (isProcessing) {
    logger.debug('Skipping processing cycle - already in progress');
    return;
  }

  try {
    await processPendingMissions();
  } catch (error) {
    logger.error('Error in processing cycle:', error);
  }
}

/**
 * Process all pending missions
 */
async function processPendingMissions(): Promise<void> {
  isProcessing = true;
  
  try {
    logger.info('🔍 Checking for pending missions...');
    
    const pendingMissions = await getPendingMissions();
    
    if (pendingMissions.length === 0) {
      logger.debug('No pending missions found');
      return;
    }

    logger.info(`📋 Processing ${pendingMissions.length} pending missions`);

    for (const mission of pendingMissions) {
      await processSingleMission(mission);
    }

    // Log processing stats
    const stats = getProcessingStats();
    logger.info('📊 Processing stats:', stats);

  } finally {
    isProcessing = false;
  }
}

/**
 * Process a single mission
 */
async function processSingleMission(mission: PendingMission): Promise<void> {
  try {
    logger.info(`🚀 Processing mission ${mission.id} from device ${mission.device_name}`);

    // Generate ATM payloads from mission data
    const payloads = await processMissionData(mission);

    if (payloads.length === 0) {
      logger.warn(`No valid payloads generated for mission ${mission.id}`);
      await markMissionAsProcessed(mission.id, false);
      return;
    }

    // Send each measurement to the ATM API
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < payloads.length; i++) {
      const payload = payloads[i];
      const success = await sendPayloadToAPI(payload, mission.id, i);
      
      if (success) {
        successCount++;
      } else {
        failureCount++;
      }
    }

    // Mark mission as processed if all payloads were sent successfully
    const allSuccessful = failureCount === 0;
    await markMissionAsProcessed(mission.id, allSuccessful);

    logger.info(`✅ Mission ${mission.id} processed: ${successCount} successful, ${failureCount} failed`);

  } catch (error) {
    logger.error(`❌ Error processing mission ${mission.id}:`, error);
    await markMissionAsProcessed(mission.id, false);
  }
}

/**
 * Send payload to ATM API
 */
async function sendPayloadToAPI(payload: ATMPayload, missionId: string, measurementIndex: number): Promise<boolean> {
  try {
    // Transform ATMPayload to legacy APIPayload format expected by poster
    const legacyPayload = {
      device_id: payload.deviceId,
      mission_id: missionId,  
      ts: payload.timestamp,
      metrics: Object.entries(payload.measurements).reduce((acc, [key, val]: [string, any]) => {
        acc[key] = val.value;
        return acc;
      }, {} as Record<string, number>)
    };

    const result = await postPayload(legacyPayload, 0, measurementIndex, 0, `${payload.deviceId}|${missionId}|${payload.timestamp}`);
    return result.success;
  } catch (error) {
    logger.error(`Error sending measurement ${measurementIndex} for mission ${missionId}:`, { error: error instanceof Error ? error.message : 'Unknown error' });
    return false;
  }
}

/**
 * Get processor status
 */
export function getProcessorStatus() {
  return {
    active: pollerHandle !== null,
    polling: isProcessing,
    pollingInterval: config.polling.intervalMs,
    stats: getProcessingStats()
  };
}