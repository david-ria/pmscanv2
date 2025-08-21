import { createHash } from 'crypto';
import { parse } from 'csv-parse';
import { Transform, Writable } from 'stream';
import { pipeline } from 'stream/promises';
import { createLogger } from './logger.js';
import { config } from './config.js';
import { postPayload } from './poster.js';
import { isRowProcessed, markRowProcessed, updateFileStats } from './state.js';
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
  originalData: CSVRow;
}

// Create SHA256 hash of normalized payload
function createPayloadHash(payload: APIPayload): string {
  // Normalize payload for consistent hashing
  const normalized = {
    idSensor: payload.idSensor,
    time: payload.time,
    data: payload.data
  };
  
  const payloadString = JSON.stringify(normalized, Object.keys(normalized).sort());
  return createHash('sha256').update(payloadString, 'utf8').digest('hex');
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
        
        // Skip if already processed (idempotency check)
        if (isRowProcessed(fileId, rowIndex)) {
          logger.debug('Skipping already processed row:', { fileId, rowIndex });
          callback(); // Skip this row
          return;
        }
        
        // Add row metadata
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

// Enhanced payload transformer with hash generation
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
        
        // Create base payload structure based on configured metrics
        const data: any = {};
        
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
        
        data.pm25 = {
          value: pm25Value,
          unit: config.metrics.units.pm25 || 'ugm3',
        };
        
        // Add other metrics if configured and available
        if (config.metrics.include.includes('pm1') && csvRow['PM1']) {
          const pm1Value = parseFloat(csvRow['PM1']);
          if (!isNaN(pm1Value)) {
            data.pm1 = {
              value: pm1Value,
              unit: config.metrics.units.pm1 || 'ugm3',
            };
          }
        }
        
        if (config.metrics.include.includes('pm10') && csvRow['PM10']) {
          const pm10Value = parseFloat(csvRow['PM10']);
          if (!isNaN(pm10Value)) {
            data.pm10 = {
              value: pm10Value,
              unit: config.metrics.units.pm10 || 'ugm3',
            };
          }
        }
        
        if (config.metrics.include.includes('temperature') && csvRow['Temperature']) {
          const tempValue = parseFloat(csvRow['Temperature']);
          if (!isNaN(tempValue)) {
            data.temperature = {
              value: tempValue,
              unit: config.metrics.units.temperature || 'celsius',
            };
          }
        }
        
        if (config.metrics.include.includes('humidity') && csvRow['Humidity']) {
          const humidityValue = parseFloat(csvRow['Humidity']);
          if (!isNaN(humidityValue)) {
            data.humidity = {
              value: humidityValue,
              unit: config.metrics.units.humidity || 'percent',
            };
          }
        }
        
        // Convert timestamp to ISO format
        const timestamp = new Date(csvRow.Timestamp).toISOString();
        
        // Create API payload
        const payload: APIPayload = {
          idSensor: sensorId,
          time: timestamp,
          data,
        };
        
        // Generate payload hash
        const payloadHash = createPayloadHash(payload);
        
        // Create processed row object
        const processedRow: ProcessedRow = {
          rowIndex: csvRow._rowIndex,
          payload,
          payloadHash,
          originalData: csvRow,
        };
        
        logger.debug('Created payload with hash:', { 
          fileId: csvRow._fileId,
          rowIndex: csvRow._rowIndex, 
          sensorId, 
          timestamp, 
          payloadHash: payloadHash.substring(0, 16) + '...',
          dataKeys: Object.keys(data)
        });
        
        callback(null, processedRow);
        
      } catch (error) {
        logger.error('Error transforming CSV row to payload:', error);
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
      // Process batch items concurrently but with rate limiting
      const batchPromises = currentBatch.map(async (processedRow) => {
        try {
          // Send payload to API
          const result = await postPayload(processedRow.payload);
          
          if (result.success) {
            // Mark as successfully sent
            markRowProcessed(
              fileId,
              processedRow.rowIndex,
              processedRow.payloadHash,
              'sent'
            );
            stats.successfulRows++;
            
            logger.debug('Payload sent successfully:', {
              fileId,
              rowIndex: processedRow.rowIndex,
              status: result.status
            });
            
          } else {
            // Mark as failed
            markRowProcessed(
              fileId,
              processedRow.rowIndex,
              processedRow.payloadHash,
              'failed',
              result.error
            );
            stats.failedRows++;
            
            logger.warn('Payload send failed:', {
              fileId,
              rowIndex: processedRow.rowIndex,
              error: result.error
            });
          }
          
        } catch (error) {
          // Mark as failed with exception
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          markRowProcessed(
            fileId,
            processedRow.rowIndex,
            processedRow.payloadHash,
            'failed',
            errorMessage
          );
          stats.failedRows++;
          
          logger.error('Exception while sending payload:', {
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