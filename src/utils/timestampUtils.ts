/**
 * Timestamp utilities with numeric epoch caching
 * Cache only numeric epochs to avoid Date object churn
 */

import { toEpochMs } from '@/lib/time';

// Cache for epoch conversions to avoid repeated processing
const epochCache = new Map<string, number>();

/**
 * Converts any timestamp format to numeric epoch with caching
 */
export function ensureEpochMs(timestamp: Date | number | string): number {
  if (typeof timestamp === 'number') {
    return timestamp;
  }
  
  const key = timestamp.toString();
  if (epochCache.has(key)) {
    return epochCache.get(key)!;
  }
  
  const epochMs = toEpochMs(timestamp);
  epochCache.set(key, epochMs);
  return epochMs;
}

/**
 * Gets numeric timestamp (legacy wrapper)
 */
export function getNumericTimestamp(timestamp: Date | number | string): number {
  return ensureEpochMs(timestamp);
}

/**
 * Legacy Date conversion - prefer working with numbers directly
 */
export function ensureDate(timestamp: Date | number | string): Date {
  const epochMs = ensureEpochMs(timestamp);
  return new Date(epochMs);
}

/**
 * Legacy time formatting - prefer timeFormat.ts functions
 */
export function formatTime(timestamp: Date | number | string): string {
  const epochMs = ensureEpochMs(timestamp);
  return new Date(epochMs).toLocaleTimeString();
}

/**
 * Clears timestamp cache when needed (call on data reset)
 */
export function clearTimestampCache(): void {
  epochCache.clear();
}

/**
 * Creates a stable hash for data change detection (excludes volatile timestamps)
 */
export function createStableDataHash(obj: unknown): string {
  if (typeof obj !== 'object' || obj === null) {
    return String(obj);
  }
  
  // Stringify without volatile fields
  const stable = Object.fromEntries(
    Object.entries(obj).filter(([key]) => 
      !['timestamp', 'monotonic', 'id', 'createdAt', 'updatedAt'].includes(key)
    )
  );
  
  return JSON.stringify(stable);
}

/**
 * Creates a temporal hash that includes timestamp for time-sensitive detection
 */
export function createTemporalDataHash(obj: unknown): string {
  return JSON.stringify(obj);
}

/**
 * Legacy data hash function - prefer createStableDataHash or createTemporalDataHash
 */
export function createDataHash(count: number, latestTimestamp?: Date | number | string, latestValue?: number): string {
  if (!latestTimestamp || !latestValue) {
    return `${count}`;
  }
  
  const timestamp = ensureEpochMs(latestTimestamp);
  return `${count}-${latestValue}-${timestamp}`;
}