import * as cron from 'node-cron';
import { config } from './config.js';
import { createLogger } from './logger.js';
import { 
  listCSVFiles, 
  downloadCSVBlob,
  blobToNodeStream,
  computeFileFingerprint,
  extractDeviceIdFromFilename
} from './supabase.js';
import { 
  isFileProcessed, 
  startFileProcessing, 
  finishFileProcessing,
  updateFileStats,
  recordProcessedRow,
  addToDeadLetterQueue 
} from './state.js';
import { loadSensorMapping, hasDeviceMapping } from './mapper.js';
import { processCSVStream } from './csvStream.js';
import { postPayload } from './poster.js';

const logger = createLogger('poller');

let isPolling = false;
let sensorMapping: Map<string, number>;
let pollStats = {
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
        
        // Extract device ID with CSV content fallback
        let deviceId = await extractDeviceIdFromFilename(file.fullPath);
        if (!deviceId) {
          deviceId = await extractDeviceIdFromFilename(file.fullPath, peekText);
        }
        
        if (!deviceId) {
          logger.warn('❌ Cannot extract device ID from filename or CSV content:', file.fullPath);
          skipped++;
          continue;
        }
        
        // Check sensor mapping
        if (!hasDeviceMapping(deviceId)) {
          logger.warn('❌ No sensor mapping for device:', { file: file.fullPath, deviceId });
          skipped++;
          continue;
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

// Process a single file with blob streaming (no full file in memory)
async function processFileWithBlob(blob: Blob, fingerprint: any, deviceId: string): Promise<void> {
  // Start file processing (creates database record with status='processing')
  const fileId = startFileProcessing(fingerprint.path, fingerprint.fingerprint, deviceId, fingerprint.size);
  
  try {
    // Convert blob to Node.js readable stream
    const stream = await blobToNodeStream(blob);
    
    // Process CSV stream row-by-row without loading full file in memory
    const stats = await processCSVStream(
      stream,
      deviceId,
      sensorMapping,
      async (payload) => {
        await processPayload(fileId, payload);
      }
    );
    
    // Finish file processing with final stats (status='done' if successful)
    const status = stats.failedRows > stats.successfulRows ? 'failed' : 'done';
    finishFileProcessing(fileId, status, stats.totalRows, stats.successfulRows, stats.failedRows);
    
    logger.info('✅ File processing completed:', { 
      path: fingerprint.path,
      deviceId, 
      fingerprint: fingerprint.fingerprint.substring(0, 16) + '...',
      status,
      ...stats 
    });
    
  } catch (error) {
    logger.error('❌ Error processing file blob:', { path: fingerprint.path, deviceId, error });
    const errorMessage = error instanceof Error ? error.message : 'Unknown processing error';
    finishFileProcessing(fileId, 'failed', 0, 0, 1, errorMessage);
  }
}

// Process a single payload (measurement row) - includes sent_rows idempotency
async function processPayload(fileId: number, payload: any): Promise<void> {
  const rowIndex = payload._rowIndex;
  const originalTimestamp = payload._originalTimestamp;
  
  // Remove metadata before posting
  const { _rowIndex, _originalTimestamp, ...apiPayload } = payload;
  
  try {
    // Post to external API
    const result = await postPayload(apiPayload);
    
    if (result.success) {
      // Record successful processing (sent_rows idempotency - won't duplicate on re-upload)
      recordProcessedRow(fileId, rowIndex, originalTimestamp, result.status || 200);
      
      logger.debug('✅ Payload posted successfully:', { 
        fileId, 
        rowIndex, 
        idSensor: apiPayload.idSensor,
        status: result.status 
      });
    } else {
      // Add to dead letter queue for retry
      addToDeadLetterQueue(
        fileId,
        rowIndex,
        JSON.stringify(apiPayload),
        result.error || 'Unknown error'
      );
      
      logger.warn('⚠️  Payload failed, added to DLQ:', { 
        fileId, 
        rowIndex, 
        error: result.error,
        status: result.status 
      });
    }
    
  } catch (error) {
    // Add to dead letter queue
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    addToDeadLetterQueue(
      fileId,
      rowIndex,
      JSON.stringify(apiPayload),
      errorMessage
    );
    
    logger.error('❌ Payload processing failed:', { 
      fileId, 
      rowIndex, 
      error: errorMessage 
    });
  }
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