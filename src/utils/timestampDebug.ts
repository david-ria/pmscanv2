/**
 * Debug utilities for timestamp analysis across the app
 * Use these functions to identify timestamp discrepancies during development
 */

import * as logger from './logger';

interface TimestampDebugInfo {
  component: string;
  operation: string;
  timestamp: Date;
  source: string;
  metadata?: Record<string, any>;
}

const timestampLogs: TimestampDebugInfo[] = [];
const MAX_LOGS = 1000; // Keep last 1000 timestamp operations

/**
 * Debug counters for monitoring timestamp issues
 */
export const dbg = {
  iso_misuse: 0,
  duplicate_bucket: 0,
};

/**
 * Report duplicate bucket detection
 */
export function reportDuplicateBucket(id: string): void {
  dbg.duplicate_bucket++;
  if (dbg.duplicate_bucket <= 3) {
    console.warn('🔄 Duplicate bucket detected:', id, `(count: ${dbg.duplicate_bucket})`);
  }
}

/**
 * Report ISO string misuse in internal processing
 */
export function reportIsoMisuse(context: string): void {
  dbg.iso_misuse++;
  if (dbg.iso_misuse <= 3) {
    console.warn('⚠️ ISO string misuse detected:', context, `(count: ${dbg.iso_misuse})`);
  }
}

/**
 * Log a timestamp operation for debugging
 */
export function logTimestamp(info: TimestampDebugInfo): void {
  const logEntry = {
    ...info,
    logTime: new Date(),
  } as TimestampDebugInfo & { logTime: Date };
  
  timestampLogs.push(logEntry);
  
  // Keep only the last MAX_LOGS entries
  if (timestampLogs.length > MAX_LOGS) {
    timestampLogs.shift();
  }
  
  logger.debug(`📅 [${info.component}] ${info.operation}:`, {
    timestamp: info.timestamp.toISOString(),
    source: info.source,
    ...info.metadata
  });
}

/**
 * Get all timestamp logs for analysis
 */
export function getTimestampLogs(): typeof timestampLogs {
  return [...timestampLogs];
}

/**
 * Analyze timestamp consistency within a recording session
 */
export function analyzeRecordingTimestamps(recordingData: any[]): {
  discrepancies: any[];
  summary: string;
} {
  const discrepancies: any[] = [];
  let prevTimestamp: Date | null = null;
  
  recordingData.forEach((entry, index) => {
    const currentTimestamp = entry.timestamp instanceof Date 
      ? entry.timestamp 
      : new Date(entry.timestamp);
    
    if (prevTimestamp) {
      const timeDiff = currentTimestamp.getTime() - prevTimestamp.getTime();
      
      // Flag any negative timestamps (recordings going backwards in time)
      if (timeDiff < 0) {
        discrepancies.push({
          index,
          issue: 'NEGATIVE_TIME_DIFF',
          timeDiff,
          currentTimestamp: currentTimestamp.toISOString(),
          previousTimestamp: prevTimestamp.toISOString(),
        });
      }
      
      // Flag very large gaps (> 5 minutes) which might indicate timestamp issues
      if (timeDiff > 5 * 60 * 1000) {
        discrepancies.push({
          index,
          issue: 'LARGE_TIME_GAP',
          timeDiff,
          gapMinutes: Math.round(timeDiff / (60 * 1000)),
          currentTimestamp: currentTimestamp.toISOString(),
          previousTimestamp: prevTimestamp.toISOString(),
        });
      }
    }
    
    prevTimestamp = currentTimestamp;
  });
  
  const summary = `Analyzed ${recordingData.length} recordings. Found ${discrepancies.length} timestamp discrepancies.`;
  
  if (discrepancies.length > 0) {
    logger.warn('⚠️ Timestamp discrepancies found:', discrepancies);
  } else {
    logger.debug('✅ No timestamp discrepancies found in recording data');
  }
  
  return { discrepancies, summary };
}

/**
 * Clear all timestamp logs (useful for testing)
 */
export function clearTimestampLogs(): void {
  timestampLogs.length = 0;
  logger.debug('🧹 Timestamp logs cleared');
}

/**
 * Export timestamp logs as CSV for analysis
 */
export function exportTimestampLogs(): string {
  const headers = ['Component', 'Operation', 'Timestamp', 'Source', 'Metadata'];
  const rows = timestampLogs.map(log => [
    log.component,
    log.operation,
    log.timestamp.toISOString(),
    log.source,
    JSON.stringify(log.metadata || {})
  ]);
  
  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

/**
 * Get monitoring counters for debugging
 */
export function getMonitoringCounters() {
  return {
    ...dbg,
    resetCounters: () => {
      dbg.iso_misuse = 0;
      dbg.duplicate_bucket = 0;
      console.log('🔄 Monitoring counters reset');
    }
  };
}
