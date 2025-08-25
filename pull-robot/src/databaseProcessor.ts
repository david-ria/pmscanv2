import { logger } from './logger.js';
import type { Config } from './config.js';
import { getPendingMissions, markMissionAsProcessed, getProcessingStats, initializeDatabasePoller, type PendingMission } from './databasePoller.js';
import { processMissionData, initializeDatabaseReader, type ATMPayload } from './databaseReader.js';
import { sendToATMAPI, initializePoster } from './poster.js';

// Processing state
let processingInterval: NodeJS.Timeout | null = null;
let isProcessing = false;
let startTime = Date.now();
let appConfig: Config | null = null;

interface ProcessorStatus {
  active: boolean;
  processing: boolean;
  uptime: number;
  stats: ReturnType<typeof getProcessingStats>;
}

/**
 * Initialize the database processor with configuration
 */
export function initializeDatabaseProcessor(config: Config) {
  appConfig = config;
  initializeDatabasePoller(config);
  initializeDatabaseReader(config);
  initializePoster(config);
}

/**
 * Start the database processor
 */
export function startDatabaseProcessor(): void {
  if (!appConfig) {
    throw new Error('Database processor not initialized');
  }
  
  if (processingInterval) {
    logger.warn('⚠️ Database processor is already running');
    return;
  }

  logger.info('🚀 Starting database processor...');
  logger.info(`📊 Polling interval: ${appConfig.polling.intervalMs}ms`);
  logger.info(`🎯 Batch size: ${appConfig.polling.batchSize} missions`);
  logger.info(`⚡ Rate limit: ${appConfig.polling.maxRps} requests/second`);

  // Start processing immediately
  processAndSchedule();

  // Schedule recurring processing
  processingInterval = setInterval(processAndSchedule, appConfig.polling.intervalMs);
}

/**
 * Stop the database processor
 */
export function stopDatabaseProcessor(): void {
  if (processingInterval) {
    clearInterval(processingInterval);
    processingInterval = null;
    logger.info('⏹️ Database processor stopped');
  }
}

/**
 * Process and schedule next run
 */
async function processAndSchedule(): Promise<void> {
  if (isProcessing) {
    logger.debug('⏳ Processing already in progress, skipping this cycle');
    return;
  }

  try {
    await processPendingMissions();
  } catch (error) {
    logger.error('💥 Error in processing cycle:', error);
  }
}

/**
 * Process all pending missions
 */
async function processPendingMissions(): Promise<void> {
  isProcessing = true;
  logger.debug('🔄 Starting mission processing cycle...');

  try {
    const missions = await getPendingMissions();
    
    if (missions.length === 0) {
      logger.debug('📭 No pending missions found');
      return;
    }

    logger.info(`📋 Processing ${missions.length} pending missions`);

    for (const mission of missions) {
      try {
        await processSingleMission(mission);
      } catch (error) {
        logger.error(`💥 Failed to process mission ${mission.id}:`, error);
        await markMissionAsProcessed(mission.id, false);
      }
    }

    const stats = getProcessingStats();
    logger.info(`📊 Processing cycle complete:`, stats);

  } finally {
    isProcessing = false;
  }
}

/**
 * Process a single mission
 */
async function processSingleMission(mission: PendingMission): Promise<void> {
  if (!appConfig) {
    throw new Error('Database processor not initialized');
  }
  
  logger.debug(`🎯 Processing mission ${mission.id} for device ${mission.device_name}`);

  try {
    // Read and transform mission data
    const payloads = await processMissionData(mission);
    
    if (payloads.length === 0) {
      logger.warn(`⚠️ No payloads generated for mission ${mission.id}`);
      await markMissionAsProcessed(mission.id, false);
      return;
    }

    // Send all payloads to API
    let successCount = 0;
    for (let i = 0; i < payloads.length; i++) {
      const payload = payloads[i];
      const success = await sendPayloadToAPI(payload, mission.id, i + 1);
      if (success) {
        successCount++;
      }
    }

    // Mark mission as processed if we had some success
    const overallSuccess = successCount > 0;
    const successRate = (successCount / payloads.length * 100).toFixed(1);
    
    if (overallSuccess) {
      logger.info(`✅ Mission ${mission.id} processed: ${successCount}/${payloads.length} payloads sent (${successRate}%)`);
    } else {
      logger.error(`❌ Mission ${mission.id} failed: 0/${payloads.length} payloads sent`);
    }

    await markMissionAsProcessed(mission.id, overallSuccess);

  } catch (error) {
    logger.error(`💥 Error processing mission ${mission.id}:`, error);
    await markMissionAsProcessed(mission.id, false);
  }
}

/**
 * Send a single payload to the API with retries
 */
async function sendPayloadToAPI(payload: ATMPayload, missionId: string, measurementIndex: number): Promise<boolean> {
  if (!appConfig) {
    throw new Error('Database processor not initialized');
  }
  
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= appConfig.polling.maxAttempts; attempt++) {
    try {
      const success = await sendToATMAPI(payload);
      if (success) {
        if (attempt > 1) {
          logger.info(`✅ Payload ${measurementIndex} for mission ${missionId} succeeded on attempt ${attempt}`);
        }
        return true;
      }
      
      // If sendToATMAPI returns false, it already logged the error
      lastError = new Error('API request failed');
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      logger.debug(`🔄 Attempt ${attempt}/${appConfig.polling.maxAttempts} failed for payload ${measurementIndex} of mission ${missionId}: ${lastError.message}`);
    }
    
    // Wait before retry (exponential backoff)
    if (attempt < appConfig.polling.maxAttempts) {
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000); // Max 30s
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  logger.error(`❌ All ${appConfig.polling.maxAttempts} attempts failed for payload ${measurementIndex} of mission ${missionId}. Last error: ${lastError?.message}`);
  return false;
}

/**
 * Get processor status
 */
export function getProcessorStatus(): ProcessorStatus {
  return {
    active: processingInterval !== null,
    processing: isProcessing,
    uptime: Date.now() - startTime,
    stats: getProcessingStats(),
  };
}