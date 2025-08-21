import { createHash } from 'crypto';
import { parse } from 'csv-parse';
import { Transform, Writable } from 'stream';
import { pipeline } from 'stream/promises';
import { createLogger } from './logger.js';
import { config } from './config.js';
import { postPayload } from './poster.js';
import { reserveRowForProcessing, updateRowProcessingStatus, updateFileStats } from './state.js';
import { CSVRowSchema, type CSVRow, type APIPayload } from './types.js';

const logger = createLogger('streaming-processor');

interface ProcessingStats {
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  skippedRows: number;
}

interface ProcessedRow {
  rowIndex: number;
  payload: APIPayload;
  payloadHash: string;
  idempotencyKey: string;
  originalData: CSVRow;
}

// Create SHA256 hash of normalized payload for idempotency
function createPayloadHash(payload: APIPayload): string {
  // Normalize payload for consistent hashing
  const normalized = {
    device_id: payload.device_id,
    mission_id: payload.mission_id,
    ts: payload.ts,
    metrics: payload.metrics
  };
  
  const payloadString = JSON.stringify(normalized, Object.keys(normalized).sort());
  return createHash('sha256').update(payloadString, 'utf8').digest('hex');
}

// Create idempotency key for request deduplication
function createIdempotencyKey(payload: APIPayload): string {
  return `${payload.device_id}|${payload.mission_id}|${payload.ts}`;
}

// Enhanced CSV row validator that tracks row indices
export function createEnhancedRowValidator(fileId: number): Transform {
  let rowIndex = 0;
  
  return new Transform({
    objectMode: true,
    transform(chunk: any, encoding: string, callback: Function) {
      try {
        rowIndex++;
        
        // Validate row structure
        const validatedRow = CSVRowSchema.parse(chunk);
        
        // Add row metadata (reservation will be handled later in pipeline)
        const enrichedRow = {
          ...validatedRow,
          _rowIndex: rowIndex,
          _fileId: fileId,
          _originalData: chunk,
        };
        
        logger.debug('Validated CSV row:', { fileId, rowIndex, timestamp: validatedRow.Timestamp });
        callback(null, enrichedRow);
        
      } catch (error) {
        logger.warn('Invalid CSV row:', { 
          fileId, 
          rowIndex, 
          error: error instanceof Error ? error.message : 'Unknown error', 
          data: chunk 
        });
        
        // Skip invalid rows but continue processing
        callback();
      }
    }
  });
}

// Enhanced payload transformer with grouped metrics format
export function createEnhancedPayloadTransformer(deviceId: string, sensorMapping: Map<string, number>): Transform {
  const sensorId = sensorMapping.get(deviceId);
  
  if (!sensorId) {
    throw new Error(`No sensor mapping found for device: ${deviceId}`);
  }
  
  return new Transform({
    objectMode: true,
    transform(chunk: any, encoding: string, callback: Function) {
      try {
        const csvRow = chunk as CSVRow & { _rowIndex: number; _fileId: number };
        
        // Create grouped metrics object
        const metrics: Record<string, number> = {};
        
        // Add PM2.5 (required)
        const pm25Value = parseFloat(csvRow['PM2.5']);
        if (isNaN(pm25Value)) {
          logger.warn('Invalid PM2.5 value:', { 
            fileId: csvRow._fileId, 
            rowIndex: csvRow._rowIndex, 
            value: csvRow['PM2.5'] 
          });
          callback();
          return;
        }
        metrics.pm25 = pm25Value;
        
        // Add other metrics if configured and available
        if (config.metrics.include.includes('pm1') && csvRow['PM1']) {
          const pm1Value = parseFloat(csvRow['PM1']);
          if (!isNaN(pm1Value)) {
            metrics.pm1 = pm1Value;
          }
        }
        
        if (config.metrics.include.includes('pm10') && csvRow['PM10']) {
          const pm10Value = parseFloat(csvRow['PM10']);
          if (!isNaN(pm10Value)) {
            metrics.pm10 = pm10Value;
          }
        }
        
        if (config.metrics.include.includes('temperature') && csvRow['Temperature']) {
          const tempValue = parseFloat(csvRow['Temperature']);
          if (!isNaN(tempValue)) {
            metrics.temperature = tempValue;
          }
        }
        
        if (config.metrics.include.includes('humidity') && csvRow['Humidity']) {
          const humidityValue = parseFloat(csvRow['Humidity']);
          if (!isNaN(humidityValue)) {
            metrics.humidity = humidityValue;
          }
        }
        
        // Convert timestamp to ISO format
        const timestamp = new Date(csvRow.Timestamp).toISOString();
        
        // Create grouped API payload
        const payload: APIPayload = {
          device_id: deviceId,
          mission_id: `mission-${sensorId}`, // Generate mission ID from sensor mapping
          ts: timestamp,
          metrics,
        };
        
        // Generate payload hash and idempotency key
        const payloadHash = createPayloadHash(payload);
        const idempotencyKey = createIdempotencyKey(payload);
        
        // Create processed row object
        const processedRow: ProcessedRow = {
          rowIndex: csvRow._rowIndex,
          payload,
          payloadHash,
          idempotencyKey,
          originalData: csvRow,
        };
        
        logger.debug('Created grouped payload:', { 
          fileId: csvRow._fileId,
          rowIndex: csvRow._rowIndex, 
          deviceId, 
          missionId: payload.mission_id,
          timestamp, 
          payloadHash: payloadHash.substring(0, 16) + '...',
          idempotencyKey,
          metricKeys: Object.keys(metrics)
        });
        
        callback(null, processedRow);
        
      } catch (error) {
        logger.error('Error transforming CSV row to grouped payload:', error);
        callback();
      }
    }
  });
}

// Backpressure-aware payload sender
export function createPayloadSender(fileId: number, stats: ProcessingStats): Writable {
  let batchBuffer: ProcessedRow[] = [];
  let isProcessing = false;
  
  return new Writable({
    objectMode: true,
    async write(chunk: ProcessedRow, encoding: string, callback: Function) {
      try {
        stats.totalRows++;
        batchBuffer.push(chunk);
        
        // Process batch when full or handle backpressure
        if (batchBuffer.length >= config.polling.batchSize || isProcessing) {
          await processBatch();
        }
        
        callback();
        
      } catch (error) {
        logger.error('Error in payload sender:', error);
        callback(error);
      }
    },
    
    async final(callback: Function) {
      // Process remaining items in batch
      if (batchBuffer.length > 0) {
        await processBatch();
      }
      
      // Update file stats
      updateFileStats(
        fileId,
        stats.totalRows,
        stats.successfulRows,
        stats.failedRows,
        new Date().toISOString()
      );
      
      logger.info('Payload processing completed:', {
        fileId,
        totalRows: stats.totalRows,
        successfulRows: stats.successfulRows,
        failedRows: stats.failedRows,
        skippedRows: stats.skippedRows
      });
      
      callback();
    }
  });
  
  async function processBatch(): Promise<void> {
    if (isProcessing || batchBuffer.length === 0) {
      return;
    }
    
    isProcessing = true;
    const currentBatch = batchBuffer.splice(0, config.polling.batchSize);
    
    try {
      // Process batch items with atomic reservation
      const batchPromises = currentBatch.map(async (processedRow) => {
        try {
          // Atomic row reservation - reserve before processing
          const reserved = reserveRowForProcessing(
            fileId,
            processedRow.rowIndex,
            processedRow.payloadHash
          );
          
          if (!reserved) {
            // Another process already reserved this row, skip it
            stats.skippedRows++;
            logger.debug('Row already reserved, skipping:', {
              fileId,
              rowIndex: processedRow.rowIndex,
              idempotencyKey: processedRow.idempotencyKey
            });
            return;
          }
          
          // Send payload to API with idempotency key
          const result = await postPayload(
            processedRow.payload, 
            fileId,
            processedRow.rowIndex, 
            0, 
            processedRow.idempotencyKey
          );
          
          
          if (result.success) {
            stats.successfulRows++;
            
            logger.debug('Grouped payload sent successfully:', {
              fileId,
              rowIndex: processedRow.rowIndex,
              idempotencyKey: processedRow.idempotencyKey,
              status: result.status
            });
            
          } else {
            stats.failedRows++;
            
            logger.warn('Grouped payload send failed:', {
              fileId,
              rowIndex: processedRow.rowIndex,
              idempotencyKey: processedRow.idempotencyKey,
              error: result.error
            });
          }
          
        } catch (error) {
          // Update status to failed with exception
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          updateRowProcessingStatus(fileId, processedRow.rowIndex, 'failed', errorMessage);
          stats.failedRows++;
          
          logger.error('Exception while processing row:', {
            fileId,
            rowIndex: processedRow.rowIndex,
            error: errorMessage
          });
        }
      });
      
      await Promise.all(batchPromises);
      
    } finally {
      isProcessing = false;
    }
  }
}

// Main streaming processor function
export async function processCSVStreamWithIdempotency(
  stream: NodeJS.ReadableStream,
  fileId: number,
  deviceId: string,
  sensorMapping: Map<string, number>
): Promise<ProcessingStats> {
  
  const stats: ProcessingStats = {
    totalRows: 0,
    successfulRows: 0,
    failedRows: 0,
    skippedRows: 0
  };
  
  logger.info('Starting streaming CSV processing with idempotency:', {
    fileId,
    deviceId,
    sensorId: sensorMapping.get(deviceId)
  });
  
  try {
    // Create processing pipeline
    const csvParser = parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relaxColumnCount: true,
    });
    
    const rowValidator = createEnhancedRowValidator(fileId);
    const payloadTransformer = createEnhancedPayloadTransformer(deviceId, sensorMapping);
    const payloadSender = createPayloadSender(fileId, stats);
    
    // Run the pipeline with proper backpressure handling
    await pipeline(
      stream,
      csvParser,
      rowValidator,
      payloadTransformer,
      payloadSender
    );
    
    logger.info('CSV streaming processing completed:', {
      fileId,
      deviceId,
      stats
    });
    
    return stats;
    
  } catch (error) {
    logger.error('CSV streaming processing failed:', {
      fileId,
      deviceId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}