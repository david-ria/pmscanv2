import * as cron from 'node-cron';
import { config } from './config.js';
import { createLogger } from './logger.js';
import { 
  listCSVFiles, 
  downloadCSVFileAsStream, 
  extractDeviceIdFromFilename,
  computeFileFingerprint 
} from './supabase.js';
import { 
  isFileProcessed, 
  markFileProcessed, 
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
        // Compute file fingerprint for idempotency
        const fingerprint = computeFileFingerprint(file);
        
        // Check if this specific file version has been processed
        if (isFileProcessed(fingerprint.path, fingerprint.fingerprint)) {
          logger.debug('⏭️  Skipping already processed file:', { 
            path: fingerprint.path, 
            fingerprint: fingerprint.fingerprint.substring(0, 16) + '...' 
          });
          skipped++;
          continue;
        }
        
        // Extract device ID
        const deviceId = extractDeviceIdFromFilename(file.name);
        if (!deviceId) {
          logger.warn('❌ Cannot extract device ID, skipping:', file.name);
          skipped++;
          continue;
        }
        
        // Check sensor mapping
        if (!hasDeviceMapping(deviceId)) {
          logger.warn('❌ No sensor mapping for device, skipping:', { file: file.name, deviceId });
          skipped++;
          continue;
        }
        
        // Process the file with streaming
        logger.info('📄 Processing file:', { 
          file: file.basename || file.name, 
          deviceId, 
          size: fingerprint.size,
          fingerprint: fingerprint.fingerprint.substring(0, 16) + '...'
        });
        
        await processFileWithStream(file, fingerprint, deviceId);
        processed++;
        
      } catch (error) {
        logger.error('❌ Error processing file:', { file: file.name, error });
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

// Process a single file with streaming (no full file in memory)
async function processFileWithStream(file: any, fingerprint: any, deviceId: string): Promise<void> {
  const filePath = file.name;
  
  // Mark file as being processed (creates database record)
  const fileId = markFileProcessed(fingerprint.path, fingerprint.fingerprint, deviceId, fingerprint.size);
  
  try {
    // Download file as ReadableStream (memory-efficient)
    const stream = await downloadCSVFileAsStream(filePath);
    if (!stream) {
      logger.error('❌ Failed to download file stream:', filePath);
      updateFileStats(fileId, 0, 0, 1);
      return;
    }
    
    // Process CSV stream row-by-row without loading full file in memory
    const stats = await processCSVStream(
      stream,
      deviceId,
      sensorMapping,
      async (payload) => {
        await processPayload(fileId, payload);
      }
    );
    
    // Update file processing stats
    updateFileStats(
      fileId, 
      stats.totalRows, 
      stats.successfulRows, 
      stats.failedRows
    );
    
    logger.info('✅ File processing completed:', { 
      file: file.basename || filePath,
      deviceId, 
      fingerprint: fingerprint.fingerprint.substring(0, 16) + '...',
      ...stats 
    });
    
  } catch (error) {
    logger.error('❌ Error processing file stream:', { file: filePath, deviceId, error });
    updateFileStats(fileId, 0, 0, 1);
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