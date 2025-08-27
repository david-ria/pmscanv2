import { createLogger } from './logger.js';
import { config } from './config.js';
import { getPendingMissions, markMissionAsProcessed, getProcessingStats } from './databasePoller.js';
import { processMissionData } from './databaseReader.js';
import { postPayload } from './poster.js';
import type { PendingMission } from './databasePoller.js';
import type { ATMPayload } from './databaseReader.js';

const logger = createLogger('processor');

let pollingInterval: NodeJS.Timeout | null = null;
let isProcessing = false;

export function startProcessor(): void {
  if (pollingInterval) {
    logger.warn('Processor is already running');
    return;
  }

  logger.info(`🤖 Starting processor with ${config.polling.intervalMs}ms interval`);
  
  // Process immediately, then set up interval
  processAndSchedule();
  
  pollingInterval = setInterval(() => {
    processAndSchedule();
  }, config.polling.intervalMs);
}

export function stopProcessor(): void {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
    logger.info('🛑 Processor stopped');
  }
}

async function processAndSchedule(): Promise<void> {
  if (isProcessing) {
    logger.debug('Processing already in progress, skipping this cycle');
    return;
  }

  try {
    isProcessing = true;
    await processPendingMissions();
  } catch (error) {
    logger.error('💥 Error in processing cycle:', error);
  } finally {
    isProcessing = false;
    
    const stats = getProcessingStats();
    logger.info(`📊 Processing cycle complete:`, stats);
  }
}

async function processPendingMissions(): Promise<void> {
  const missions = await getPendingMissions();
  
  if (missions.length === 0) {
    logger.debug('No pending missions to process');
    return;
  }

  logger.info(`📦 Processing ${missions.length} missions`);

  for (const mission of missions) {
    try {
      await processSingleMission(mission);
    } catch (error) {
      logger.error(`💥 Failed to process mission ${mission.id}:`, error);
      await markMissionAsProcessed(mission.id, false);
    }
  }
}

async function processSingleMission(mission: PendingMission): Promise<void> {
  logger.info(`🔄 Processing mission ${mission.id} (${mission.device_name})`);
  
  const payloads = await processMissionData(mission);
  
  if (payloads.length === 0) {
    logger.warn(`No payloads generated for mission ${mission.id}`);
    await markMissionAsProcessed(mission.id, false);
    return;
  }

  let successCount = 0;
  
  for (let i = 0; i < payloads.length; i++) {
    const payload = payloads[i];
    const result = await postPayload(payload);
    
    if (result.success) {
      successCount++;
    } else {
      logger.error(`Failed to send payload ${i + 1}/${payloads.length} for mission ${mission.id}`);
    }
  }

  const success = successCount > 0;
  await markMissionAsProcessed(mission.id, success);
  
  logger.info(`✅ Mission ${mission.id}: ${successCount}/${payloads.length} payloads sent successfully`);
}

export function getProcessorStatus(): any {
  return {
    isRunning: pollingInterval !== null,
    isProcessing,
    intervalMs: config.polling.intervalMs,
    stats: getProcessingStats(),
  };
}