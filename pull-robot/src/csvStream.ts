import { parse } from 'csv-parse';
import { Transform } from 'stream';
import { createLogger } from './logger.js';
import { CSVRowSchema, type CSVRow } from './types.js';

const logger = createLogger('csv-stream');

// Create a CSV parser stream
export function createCSVParser(): Transform {
  return parse({
    columns: true, // Use first row as headers
    skip_empty_lines: true,
    trim: true,
    relaxColumnCount: true, // Allow rows with different column counts
  });
}

// Transform stream to validate and parse CSV rows
export function createRowValidator(): Transform {
  let rowIndex = 0;
  
  return new Transform({
    objectMode: true,
    transform(chunk: any, encoding: string, callback: Function) {
      try {
        rowIndex++;
        
        // Validate row structure
        const validatedRow = CSVRowSchema.parse(chunk);
        
        // Add row metadata
        const enrichedRow = {
          ...validatedRow,
          _rowIndex: rowIndex,
          _originalData: chunk,
        };
        
        logger.debug('Validated CSV row:', { rowIndex, timestamp: validatedRow.Timestamp });
        callback(null, enrichedRow);
        
      } catch (error) {
        logger.warn('Invalid CSV row:', { rowIndex, error: error instanceof Error ? error.message : 'Unknown error', data: chunk });
        
        // Skip invalid rows but continue processing
        callback();
      }
    }
  });
}

// Transform stream to convert CSV rows to API payloads
export function createPayloadTransformer(deviceId: string, sensorMapping: Map<string, number>): Transform {
  const sensorId = sensorMapping.get(deviceId);
  
  if (!sensorId) {
    throw new Error(`No sensor mapping found for device: ${deviceId}`);
  }
  
  return new Transform({
    objectMode: true,
    transform(chunk: any, encoding: string, callback: Function) {
      try {
        const csvRow = chunk as CSVRow & { _rowIndex: number };
        
        // Parse PM2.5 value
        const pm25Value = parseFloat(csvRow['PM2.5']);
        if (isNaN(pm25Value)) {
          logger.warn('Invalid PM2.5 value:', { rowIndex: csvRow._rowIndex, value: csvRow['PM2.5'] });
          callback();
          return;
        }
        
        // Convert timestamp to ISO format
        const timestamp = new Date(csvRow.Timestamp).toISOString();
        
        // Create API payload
        const payload = {
          idSensor: sensorId,
          time: timestamp,
          data: {
            pm25: {
              value: pm25Value,
              unit: 'ugm3' as const,
            },
          },
        };
        
        // Add metadata for tracking
        const enrichedPayload = {
          ...payload,
          _rowIndex: csvRow._rowIndex,
          _originalTimestamp: csvRow.Timestamp,
        };
        
        logger.debug('Created payload:', { 
          rowIndex: csvRow._rowIndex, 
          sensorId, 
          timestamp, 
          pm25Value 
        });
        
        callback(null, enrichedPayload);
        
      } catch (error) {
        logger.error('Error transforming CSV row to payload:', error);
        callback();
      }
    }
  });
}

// Utility to process a CSV stream and return processed rows count
export async function processCSVStream(
  stream: ReadableStream<Uint8Array>,
  deviceId: string,
  sensorMapping: Map<string, number>,
  onPayload: (payload: any) => Promise<void>
): Promise<{ totalRows: number; successfulRows: number; failedRows: number }> {
  
  return new Promise((resolve, reject) => {
    let totalRows = 0;
    let successfulRows = 0;
    let failedRows = 0;
    
    const nodeStream = new ReadableStream({
      start(controller) {
        const reader = stream.getReader();
        
        function pump(): Promise<void> {
          return reader.read().then(({ done, value }) => {
            if (done) {
              controller.close();
              return;
            }
            controller.enqueue(value);
            return pump();
          });
        }
        
        return pump();
      }
    });
    
    // Convert ReadableStream to Node.js Readable
    const { Readable } = await import('stream');
    const nodeReadable = Readable.fromWeb(nodeStream as any);
    
    const csvParser = createCSVParser();
    const rowValidator = createRowValidator();
    const payloadTransformer = createPayloadTransformer(deviceId, sensorMapping);
    
    // Pipeline: ReadableStream -> CSV Parser -> Row Validator -> Payload Transformer
    nodeReadable
      .pipe(csvParser)
      .pipe(rowValidator)
      .pipe(payloadTransformer)
      .on('data', async (payload) => {
        try {
          totalRows++;
          await onPayload(payload);
          successfulRows++;
        } catch (error) {
          failedRows++;
          logger.error('Error processing payload:', { payload, error });
        }
      })
      .on('end', () => {
        logger.info('CSV processing completed:', { totalRows, successfulRows, failedRows });
        resolve({ totalRows, successfulRows, failedRows });
      })
      .on('error', (error) => {
        logger.error('CSV processing failed:', error);
        reject(error);
      });
  });
}