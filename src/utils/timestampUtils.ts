/**
 * Centralized timestamp utilities to avoid redundant processing
 */

// Cache for timestamp conversions to avoid repeated processing
const timestampCache = new Map<number | string, Date>();

/**
 * Converts any timestamp format to Date object with caching
 */
export function ensureDate(timestamp: Date | number | string): Date {
  if (timestamp instanceof Date) {
    return timestamp;
  }
  
  const key = timestamp.toString();
  if (timestampCache.has(key)) {
    return timestampCache.get(key)!;
  }
  
  const date = new Date(timestamp);
  timestampCache.set(key, date);
  return date;
}

/**
 * Gets numeric timestamp with caching
 */
export function getNumericTimestamp(timestamp: Date | number | string): number {
  if (typeof timestamp === 'number') {
    return timestamp;
  }
  
  return ensureDate(timestamp).getTime();
}

/**
 * Formats time consistently across the app
 */
export function formatTime(timestamp: Date | number | string): string {
  return ensureDate(timestamp).toLocaleTimeString();
}

/**
 * Clears timestamp cache when needed (call on data reset)
 */
export function clearTimestampCache(): void {
  timestampCache.clear();
}

/**
 * Creates a consistent hash for data change detection
 */
export function createDataHash(count: number, latestTimestamp?: Date | number | string, latestValue?: number): string {
  if (!latestTimestamp || !latestValue) {
    return `${count}`;
  }
  
  const timestamp = getNumericTimestamp(latestTimestamp);
  return `${count}-${latestValue}-${timestamp}`;
}