import * as cron from 'node-cron';
import { config } from './config.js';
import { createLogger } from './logger.js';
import { 
  listCSVFiles, 
  downloadCSVFile, 
  extractDeviceIdFromFilename 
} from './supabase.js';
import { 
  isFileProcessed, 
  startFileProcessing, 
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

// Main polling and processing logic
async function pollAndProcess(): Promise<void> {
  if (isPolling) {
    logger.debug('Polling already in progress, skipping');
    return;
  }
  
  isPolling = true;
  
  try {
    logger.debug('Starting polling cycle...');
    
    // Get list of CSV files from Supabase Storage
    const files = await listCSVFiles();
    logger.info(`Found ${files.length} CSV files in storage`);
    
    if (files.length === 0) {
      logger.debug('No CSV files found');
      return;
    }
    
    // Process files in batches to avoid overwhelming the system
    const batchSize = config.polling.batchSize;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      await processBatch(batch);
    }
    
    logger.info('Polling cycle completed');
    
  } catch (error) {
    logger.error('Error during polling cycle:', error);
  } finally {
    isPolling = false;
  }
}

// Process a batch of files
async function processBatch(files: any[]): Promise<void> {
  for (const file of files) {
    try {
      await processFile(file);
    } catch (error) {
      logger.error('Error processing file:', { filename: file.name, error });
    }
  }
}

// Process a single CSV file
async function processFile(file: any): Promise<void> {
  const filename = file.name;
  
  // Check if file has already been processed
  if (isFileProcessed(filename)) {
    logger.debug('File already processed, skipping:', filename);
    return;
  }
  
  // Extract device ID from filename
  const deviceId = extractDeviceIdFromFilename(filename);
  if (!deviceId) {
    logger.warn('Cannot extract device ID from filename, skipping:', filename);
    return;
  }
  
  // Check if we have sensor mapping for this device
  if (!hasDeviceMapping(deviceId)) {
    logger.warn('No sensor mapping found for device, skipping:', { filename, deviceId });
    return;
  }
  
  logger.info('Processing file:', { filename, deviceId });
  
  // Start processing in database
  const fileId = startFileProcessing(filename, deviceId);
  
  try {
    // Download file as stream
    const stream = await downloadCSVFile(filename);
    if (!stream) {
      logger.error('Failed to download file:', filename);
      updateFileStats(fileId, 0, 0, 1);
      return;
    }
    
    // Process CSV stream
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
    
    logger.info('File processing completed:', { 
      filename, 
      deviceId, 
      ...stats 
    });
    
  } catch (error) {
    logger.error('Error processing file:', { filename, deviceId, error });
    updateFileStats(fileId, 0, 0, 1);
  }
}

// Process a single payload (measurement row)
async function processPayload(fileId: number, payload: any): Promise<void> {
  const rowIndex = payload._rowIndex;
  const originalTimestamp = payload._originalTimestamp;
  
  // Remove metadata before posting
  const { _rowIndex, _originalTimestamp, ...apiPayload } = payload;
  
  try {
    // Post to external API
    const result = await postPayload(apiPayload);
    
    if (result.success) {
      // Record successful processing
      recordProcessedRow(fileId, rowIndex, originalTimestamp, result.status || 200);
      
      logger.debug('Payload posted successfully:', { 
        fileId, 
        rowIndex, 
        idSensor: apiPayload.idSensor,
        status: result.status 
      });
    } else {
      // Add to dead letter queue
      addToDeadLetterQueue(
        fileId,
        rowIndex,
        JSON.stringify(apiPayload),
        result.error || 'Unknown error'
      );
      
      logger.warn('Payload failed, added to DLQ:', { 
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
    
    logger.error('Payload processing failed:', { 
      fileId, 
      rowIndex, 
      error: errorMessage 
    });
  }
}

// Get poller status
export function getPollerStatus(): {
  isActive: boolean;
  intervalMs: number;
  lastPollTime: string | null;
} {
  return {
    isActive: isPolling,
    intervalMs: config.polling.intervalMs,
    lastPollTime: new Date().toISOString(), // This could be tracked more precisely
  };
}