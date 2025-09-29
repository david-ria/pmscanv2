import * as cron from 'node-cron';
import { config } from './config.js';
import { createLogger } from './logger.js';
import { 
  listCSVFiles, 
  downloadCSVBlob,
  blobToNodeStream,
  computeFileFingerprint
} from './supabase.js';
import { 
  isFileProcessed, 
  startFileProcessing, 
  finishFileProcessing,
  updateFileStats,
  recordProcessedRow,
  addToDeadLetterQueue 
} from './state.js';
import { loadSensorMapping, hasDeviceMapping, getSensorId } from './mapper.js';
import { processCSVStreamWithIdempotency } from './streamingProcessor.js';
import { postPayload } from './poster.js';
import { resolveDeviceId, logAllowListSkip } from './deviceResolver.js';

const logger = createLogger('poller');

let isPolling = false;
let sensorMapping: Map<string, number>;
const pollStats = {
  totalScanned: 0,
  totalSkipped: 0,
  totalProcessed: 0,
  lastPollAt: null as string | null,
};

// Start the polling service
export async function startPoller(): Promise<void> {
  try {
    // Load sensor mapping at startup
    sensorMapping = await loadSensorMapping();
    
    // Schedule polling based on configuration
    if (config.polling.intervalMs > 0) {
      // Use setInterval for simple millisecond-based intervals
      setInterval(pollAndProcess, config.polling.intervalMs);
      logger.info(`Polling scheduled every ${config.polling.intervalMs}ms`);
    } else {
      logger.warn('Polling interval is 0 or negative, polling disabled');
    }
    
    // Run initial poll
    await pollAndProcess();
    
  } catch (error) {
    logger.error('Failed to start poller:', error);
    throw error;
  }
}

// Main polling and processing logic with fingerprinting
export async function pollAndProcess(): Promise<void> {
  if (isPolling) {
    logger.debug('Polling already in progress, skipping');
    return;
  }
  
  isPolling = true;
  pollStats.lastPollAt = new Date().toISOString();
  
  try {
    logger.info('🔄 Starting polling cycle...');
    
    // Get list of CSV files from Supabase Storage (sorted oldest→newest)
    const files = await listCSVFiles();
    pollStats.totalScanned += files.length;
    
    logger.info(`📁 Found ${files.length} CSV files in storage (oldest→newest)`);
    
    if (files.length === 0) {
      logger.debug('No CSV files found');
      return;
    }
    
    // Process files with fingerprint-based idempotency
    let processed = 0;
    let skipped = 0;
    
    for (const file of files) {
      try {
        // Download file as blob for fingerprinting and non-destructive peek
        const blobResult = await downloadCSVBlob(file.fullPath);
        if (!blobResult) {
          logger.warn('❌ Failed to download file blob:', file.fullPath);
          skipped++;
          continue;
        }
        
        // Compute fingerprint after download using fullPath, blob.size, and updatedAt
        const fingerprint = computeFileFingerprint(blobResult.fullPath, blobResult.blob.size, file.updated_at || file.created_at);
        
        // Check if this specific file version has been processed
        if (isFileProcessed(fingerprint.path, fingerprint.fingerprint)) {
          logger.debug('⏭️  Skipping already processed file:', { 
            path: fingerprint.path, 
            fingerprint: fingerprint.fingerprint.substring(0, 16) + '...' 
          });
          skipped++;
          continue;
        }
        
        // Non-destructive peek for device ID using blob.slice()
        const peekChunk = blobResult.blob.slice(0, 2048);
        const peekText = await peekChunk.text();
        
        // Resolve device ID using (a)→(d) priority order
        const resolution = await resolveDeviceId(file.fullPath, peekText);
        
        if (resolution.shouldSkip) {
          if (resolution.skipReason === 'not_in_allow_list' && resolution.deviceId) {
            logAllowListSkip(file.fullPath, resolution.deviceId);
          } else if (resolution.skipReason === 'unknown_device') {
            logger.warn('❌ SKIPPING: Unknown device (no resolution possible):', { 
              file: file.fullPath, 
              behavior: config.deviceResolution.unknownBehavior 
            });
          }
          skipped++;
          continue;
        }
        
        const deviceId = resolution.deviceId!; // Safe since shouldSkip is false
        
        // Check sensor mapping for resolved device ID
        const idSensor = getSensorId(deviceId);
        if (idSensor == null) {
          if (config.deviceResolution.unknownMappingBehavior === 'skip') {
            logger.warn('⏭️  Skipping due to missing mapping (per config=skip)', {
              file: file.fullPath, deviceId
            });
            skipped++;
            continue; // no DLQ in skip mode
          } else {
            // default: dlq
            const key = `${deviceId}|${'unknown_mission'}|${new Date().toISOString()}`;
            addToDeadLetterQueue(key, JSON.stringify({ file: file.fullPath, deviceId }),
                    undefined, 'missing_mapping');
            logger.error('🧾 DLQ: missing mapping for resolved device', {
              file: file.fullPath, deviceId
            });
            skipped++;   // counted as not processed here
            continue;
          }
        }
        
        // Process the file with streaming from fresh blob
        logger.info('📄 Processing file:', { 
          file: file.basename || file.fullPath, 
          deviceId, 
          size: fingerprint.size,
          fingerprint: fingerprint.fingerprint.substring(0, 16) + '...'
        });
        
        await processFileWithBlob(blobResult.blob, fingerprint, deviceId);
        processed++;
        
      } catch (error) {
        logger.error('❌ Error processing file:', { file: file.fullPath, error });
        skipped++;
      }
    }
    
    // Update stats and log summary
    pollStats.totalProcessed += processed;
    pollStats.totalSkipped += skipped;
    
    logger.info('✅ Polling cycle completed:', { 
      scanned: files.length,
      processed,
      skipped,
      totalScanned: pollStats.totalScanned,
      totalProcessed: pollStats.totalProcessed,
      totalSkipped: pollStats.totalSkipped
    });
    
  } catch (error) {
    logger.error('💥 Error during polling cycle:', error);
  } finally {
    isPolling = false;
  }
}

// Process a single file with blob streaming using enhanced idempotency processor
async function processFileWithBlob(blob: Blob, fingerprint: { path: string; fingerprint: string; size: number }, deviceId: string): Promise<void> {
  // Start file processing (creates database record with status='processing')
  const fileId = startFileProcessing(fingerprint.path, fingerprint.fingerprint, deviceId, fingerprint.size);
  
  try {
    // Convert blob to Node.js readable stream
    const nodeStream = blobToNodeStream(blob);
    
    // Process CSV file with enhanced streaming parser (includes idempotency)
    const stats = await processCSVStreamWithIdempotency(
      nodeStream,
      fileId,
      deviceId,
      sensorMapping
    );
    
    // Update final statistics (skippedRows are rows that were already processed)
    finishFileProcessing(
      fileId, 
      'done', 
      stats.totalRows, 
      stats.successfulRows, 
      stats.failedRows
    );
    
    logger.info('File processing completed:', { 
      fingerprint: fingerprint.fingerprint.substring(0, 16) + '...',
      deviceId, 
      stats,
      skippedDueToIdempotency: stats.skippedRows
    });
    
  } catch (error) {
    logger.error('File processing failed:', { fingerprint: fingerprint.fingerprint.substring(0, 16) + '...', deviceId, error });
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown processing error';
    finishFileProcessing(fileId, 'failed', 0, 0, 1, errorMessage);
    
    throw error;
  }
}

// Legacy function - now replaced by enhanced streaming processor
// Kept for reference but no longer used
async function processPayload(fileId: number, payload: unknown): Promise<void> {
  // This function is now handled by the enhanced streaming processor
  // which includes proper idempotency checks and payload hashing
  logger.debug('Legacy processPayload called - this should not happen with new streaming processor');
}

// Get poller status with statistics
export function getPollerStatus(): {
  isActive: boolean;
  intervalMs: number;
  lastPollTime: string | null;
  totalScanned: number;
  totalProcessed: number;
  totalSkipped: number;
} {
  return {
    isActive: isPolling,
    intervalMs: config.polling.intervalMs,
    lastPollTime: pollStats.lastPollAt,
    totalScanned: pollStats.totalScanned,
    totalProcessed: pollStats.totalProcessed,
    totalSkipped: pollStats.totalSkipped,
  };
}