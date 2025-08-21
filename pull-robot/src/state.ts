import Database from 'better-sqlite3';
import { config } from './config.js';
import { createLogger } from './logger.js';
import type { ProcessedFile, ProcessedRow, DeadLetterEntry, ProcessingState } from './types.js';

const logger = createLogger('state');
let db: Database.Database;

// Initialize SQLite database with schema
export async function initializeDatabase(): Promise<void> {
  try {
    const dbPath = process.env.DB_PATH || '/app/data/robot-state.db';
    db = new Database(dbPath);
    
    // Enable WAL mode for better concurrent access
    db.pragma('journal_mode = WAL');
    
    // Create tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS processed_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT UNIQUE NOT NULL,
        device_id TEXT NOT NULL,
        processed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        total_rows INTEGER NOT NULL DEFAULT 0,
        successful_rows INTEGER NOT NULL DEFAULT 0,
        failed_rows INTEGER NOT NULL DEFAULT 0,
        last_row_timestamp TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS processed_rows (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_id INTEGER NOT NULL,
        row_index INTEGER NOT NULL,
        timestamp TEXT NOT NULL,
        sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        response_status INTEGER,
        FOREIGN KEY (file_id) REFERENCES processed_files (id),
        UNIQUE(file_id, row_index)
      );
      
      CREATE TABLE IF NOT EXISTS dead_letter_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_id INTEGER NOT NULL,
        row_index INTEGER NOT NULL,
        payload TEXT NOT NULL,
        error_message TEXT NOT NULL,
        attempt_count INTEGER NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_attempt_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (file_id) REFERENCES processed_files (id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_processed_files_filename ON processed_files(filename);
      CREATE INDEX IF NOT EXISTS idx_processed_files_device_id ON processed_files(device_id);
      CREATE INDEX IF NOT EXISTS idx_processed_rows_file_id ON processed_rows(file_id);
      CREATE INDEX IF NOT EXISTS idx_processed_rows_timestamp ON processed_rows(timestamp);
      CREATE INDEX IF NOT EXISTS idx_dlq_file_id ON dead_letter_queue(file_id);
      CREATE INDEX IF NOT EXISTS idx_dlq_attempt_count ON dead_letter_queue(attempt_count);
    `);
    
    logger.info('Database schema initialized');
  } catch (error) {
    logger.error('Failed to initialize database:', error);
    throw error;
  }
}

// Test database connection
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    if (!db) return false;
    db.prepare('SELECT 1').get();
    return true;
  } catch (error) {
    logger.error('Database connection test failed:', error);
    return false;
  }
}

// Check if a file has been processed
export function isFileProcessed(filename: string): boolean {
  try {
    const stmt = db.prepare('SELECT id FROM processed_files WHERE filename = ?');
    const result = stmt.get(filename);
    return !!result;
  } catch (error) {
    logger.error('Error checking if file is processed:', error);
    return false;
  }
}

// Start processing a new file
export function startFileProcessing(filename: string, deviceId: string): number {
  try {
    const stmt = db.prepare(`
      INSERT INTO processed_files (filename, device_id, total_rows)
      VALUES (?, ?, 0)
    `);
    const result = stmt.run(filename, deviceId);
    
    if (typeof result.lastInsertRowid === 'number') {
      logger.debug('Started processing file:', { filename, deviceId, fileId: result.lastInsertRowid });
      return result.lastInsertRowid;
    } else {
      throw new Error('Failed to get file ID');
    }
  } catch (error) {
    logger.error('Error starting file processing:', error);
    throw error;
  }
}

// Update file processing stats
export function updateFileStats(fileId: number, totalRows: number, successfulRows: number, failedRows: number, lastRowTimestamp?: string): void {
  try {
    const stmt = db.prepare(`
      UPDATE processed_files 
      SET total_rows = ?, successful_rows = ?, failed_rows = ?, last_row_timestamp = ?, processed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(totalRows, successfulRows, failedRows, lastRowTimestamp || null, fileId);
    
    logger.debug('Updated file stats:', { fileId, totalRows, successfulRows, failedRows });
  } catch (error) {
    logger.error('Error updating file stats:', error);
    throw error;
  }
}

// Record a successfully processed row
export function recordProcessedRow(fileId: number, rowIndex: number, timestamp: string, responseStatus: number): void {
  try {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO processed_rows (file_id, row_index, timestamp, response_status)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(fileId, rowIndex, timestamp, responseStatus);
  } catch (error) {
    logger.error('Error recording processed row:', error);
    throw error;
  }
}

// Add to dead letter queue
export function addToDeadLetterQueue(fileId: number, rowIndex: number, payload: string, errorMessage: string): void {
  try {
    const stmt = db.prepare(`
      INSERT INTO dead_letter_queue (file_id, row_index, payload, error_message)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(fileId, rowIndex, payload, errorMessage);
    
    logger.warn('Added to dead letter queue:', { fileId, rowIndex, errorMessage });
  } catch (error) {
    logger.error('Error adding to dead letter queue:', error);
    throw error;
  }
}

// Get processing statistics
export async function getProcessingState(): Promise<ProcessingState> {
  try {
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as files_processed,
        SUM(total_rows) as rows_processed,
        SUM(successful_rows) as rows_sent,
        SUM(failed_rows) as rows_failed
      FROM processed_files
    `).get() as any;
    
    const dlqCount = db.prepare('SELECT COUNT(*) as count FROM dead_letter_queue').get() as any;
    
    const lastFile = db.prepare(`
      SELECT filename, processed_at 
      FROM processed_files 
      ORDER BY processed_at DESC 
      LIMIT 1
    `).get() as any;
    
    return {
      filesProcessed: stats?.files_processed || 0,
      rowsProcessed: stats?.rows_processed || 0,
      rowsSent: stats?.rows_sent || 0,
      rowsFailed: stats?.rows_failed || 0,
      deadLetterCount: dlqCount?.count || 0,
      lastPollAt: new Date().toISOString(), // Will be updated by poller
      lastProcessedFile: lastFile?.filename || null,
    };
  } catch (error) {
    logger.error('Error getting processing state:', error);
    return {
      filesProcessed: 0,
      rowsProcessed: 0,
      rowsSent: 0,
      rowsFailed: 0,
      deadLetterCount: 0,
      lastPollAt: null,
      lastProcessedFile: null,
    };
  }
}

// Get dead letter queue entries for retry
export function getDeadLetterEntries(limit: number = 100): DeadLetterEntry[] {
  try {
    const stmt = db.prepare(`
      SELECT * FROM dead_letter_queue
      WHERE attempt_count < ?
      ORDER BY created_at
      LIMIT ?
    `);
    return stmt.all(5, limit) as DeadLetterEntry[]; // Max 5 attempts
  } catch (error) {
    logger.error('Error getting dead letter entries:', error);
    return [];
  }
}

// Update dead letter entry attempt
export function updateDeadLetterAttempt(id: number, errorMessage: string): void {
  try {
    const stmt = db.prepare(`
      UPDATE dead_letter_queue 
      SET attempt_count = attempt_count + 1, 
          error_message = ?, 
          last_attempt_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(errorMessage, id);
  } catch (error) {
    logger.error('Error updating dead letter attempt:', error);
  }
}

// Remove from dead letter queue (successful retry)
export function removeFromDeadLetterQueue(id: number): void {
  try {
    const stmt = db.prepare('DELETE FROM dead_letter_queue WHERE id = ?');
    stmt.run(id);
  } catch (error) {
    logger.error('Error removing from dead letter queue:', error);
  }
}