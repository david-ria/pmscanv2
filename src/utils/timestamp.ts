/**
 * Timestamp Standardization Utilities
 * 
 * Centralized timestamp management to ensure consistency across the app.
 * All timestamps should use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)
 * 
 * Benefits:
 * - Consistent format everywhere
 * - TypeScript validation
 * - Easy debugging with branded types
 * - Single source of truth
 */

// ============================================
// BRANDED TYPES FOR TYPE SAFETY
// ============================================

/**
 * Branded type for ISO 8601 timestamp strings
 * Prevents accidental mixing of different timestamp formats
 */
export type ISOTimestamp = string & { readonly __brand: 'ISOTimestamp' };

/**
 * Branded type for Unix epoch milliseconds
 * Use when you specifically need epoch format
 */
export type EpochMs = number & { readonly __brand: 'EpochMs' };

// ============================================
// CORE TIMESTAMP FUNCTIONS
// ============================================

/**
 * Create an ISO timestamp from a Date object
 * This is the PRIMARY function to use for creating timestamps
 * 
 * @example
 * const now = createISOTimestamp(); // Current time
 * const specific = createISOTimestamp(new Date('2024-01-01'));
 */
export function createISOTimestamp(date?: Date | string | number): ISOTimestamp {
  const d = date ? new Date(date) : new Date();
  
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid date provided to createISOTimestamp: ${date}`);
  }
  
  return d.toISOString() as ISOTimestamp;
}

/**
 * Get current timestamp as ISO string
 * Shorthand for createISOTimestamp()
 */
export function now(): ISOTimestamp {
  return createISOTimestamp();
}

/**
 * Create epoch milliseconds timestamp
 * Use only when you specifically need epoch format (e.g., for indexedDB keys)
 */
export function createEpochMs(date?: Date | string | number): EpochMs {
  const d = date ? new Date(date) : new Date();
  
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid date provided to createEpochMs: ${date}`);
  }
  
  return d.getTime() as EpochMs;
}

/**
 * Get current timestamp as epoch milliseconds
 */
export function nowEpochMs(): EpochMs {
  return Date.now() as EpochMs;
}

// ============================================
// CONVERSION FUNCTIONS
// ============================================

/**
 * Convert ISO timestamp to epoch milliseconds
 */
export function isoToEpoch(iso: ISOTimestamp): EpochMs {
  const ms = new Date(iso).getTime();
  if (isNaN(ms)) {
    throw new Error(`Invalid ISO timestamp: ${iso}`);
  }
  return ms as EpochMs;
}

/**
 * Convert epoch milliseconds to ISO timestamp
 */
export function epochToISO(epoch: EpochMs): ISOTimestamp {
  return new Date(epoch).toISOString() as ISOTimestamp;
}

/**
 * Convert ISO timestamp to Date object
 */
export function isoToDate(iso: ISOTimestamp): Date {
  const date = new Date(iso);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid ISO timestamp: ${iso}`);
  }
  return date;
}

/**
 * Convert epoch milliseconds to Date object
 */
export function epochToDate(epoch: EpochMs): Date {
  return new Date(epoch);
}

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Check if a string is a valid ISO timestamp
 */
export function isValidISOTimestamp(value: unknown): value is ISOTimestamp {
  if (typeof value !== 'string') return false;
  
  // ISO 8601 regex pattern
  const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
  if (!isoPattern.test(value)) return false;
  
  const date = new Date(value);
  return !isNaN(date.getTime());
}

/**
 * Check if a number is a valid epoch milliseconds
 */
export function isValidEpochMs(value: unknown): value is EpochMs {
  if (typeof value !== 'number') return false;
  if (!Number.isFinite(value)) return false;
  if (value < 0) return false;
  
  // Reasonable range: between year 2000 and 2100
  const minEpoch = 946684800000; // 2000-01-01
  const maxEpoch = 4102444800000; // 2100-01-01
  
  return value >= minEpoch && value <= maxEpoch;
}

/**
 * Safely parse any timestamp input to ISO format
 * Handles: ISO strings, epoch ms, Date objects
 */
export function safeParseToISO(input: unknown): ISOTimestamp | null {
  try {
    if (input instanceof Date) {
      return createISOTimestamp(input);
    }
    
    if (typeof input === 'string') {
      if (isValidISOTimestamp(input)) {
        return input;
      }
      // Try to parse as date string
      const date = new Date(input);
      if (!isNaN(date.getTime())) {
        return createISOTimestamp(date);
      }
    }
    
    if (typeof input === 'number') {
      if (isValidEpochMs(input)) {
        return epochToISO(input as EpochMs);
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

// ============================================
// COMPARISON FUNCTIONS
// ============================================

/**
 * Compare two timestamps
 * Returns: -1 if a < b, 0 if a === b, 1 if a > b
 */
export function compareTimestamps(
  a: ISOTimestamp | EpochMs,
  b: ISOTimestamp | EpochMs
): -1 | 0 | 1 {
  const aMs = typeof a === 'string' ? isoToEpoch(a) : a;
  const bMs = typeof b === 'string' ? isoToEpoch(b) : b;
  
  if (aMs < bMs) return -1;
  if (aMs > bMs) return 1;
  return 0;
}

/**
 * Check if timestamp is in the past
 */
export function isPast(timestamp: ISOTimestamp | EpochMs): boolean {
  const ms = typeof timestamp === 'string' ? isoToEpoch(timestamp) : timestamp;
  return ms < Date.now();
}

/**
 * Check if timestamp is in the future
 */
export function isFuture(timestamp: ISOTimestamp | EpochMs): boolean {
  const ms = typeof timestamp === 'string' ? isoToEpoch(timestamp) : timestamp;
  return ms > Date.now();
}

// ============================================
// ARITHMETIC FUNCTIONS
// ============================================

/**
 * Add milliseconds to a timestamp
 */
export function addMilliseconds(
  timestamp: ISOTimestamp,
  ms: number
): ISOTimestamp {
  const date = isoToDate(timestamp);
  date.setMilliseconds(date.getMilliseconds() + ms);
  return createISOTimestamp(date);
}

/**
 * Add seconds to a timestamp
 */
export function addSeconds(timestamp: ISOTimestamp, seconds: number): ISOTimestamp {
  return addMilliseconds(timestamp, seconds * 1000);
}

/**
 * Add minutes to a timestamp
 */
export function addMinutes(timestamp: ISOTimestamp, minutes: number): ISOTimestamp {
  return addMilliseconds(timestamp, minutes * 60 * 1000);
}

/**
 * Add hours to a timestamp
 */
export function addHours(timestamp: ISOTimestamp, hours: number): ISOTimestamp {
  return addMilliseconds(timestamp, hours * 60 * 60 * 1000);
}

/**
 * Add days to a timestamp
 */
export function addDays(timestamp: ISOTimestamp, days: number): ISOTimestamp {
  return addMilliseconds(timestamp, days * 24 * 60 * 60 * 1000);
}

/**
 * Get difference between two timestamps in milliseconds
 */
export function diffMilliseconds(
  a: ISOTimestamp,
  b: ISOTimestamp
): number {
  return isoToEpoch(a) - isoToEpoch(b);
}

/**
 * Get difference between two timestamps in seconds
 */
export function diffSeconds(a: ISOTimestamp, b: ISOTimestamp): number {
  return Math.floor(diffMilliseconds(a, b) / 1000);
}

/**
 * Get difference between two timestamps in minutes
 */
export function diffMinutes(a: ISOTimestamp, b: ISOTimestamp): number {
  return Math.floor(diffMilliseconds(a, b) / (60 * 1000));
}

// ============================================
// MIGRATION HELPERS
// ============================================

/**
 * Helper to migrate old timestamp formats to ISO
 * Use during data migration or when reading legacy data
 */
export function migrateTimestamp(input: unknown): ISOTimestamp {
  const parsed = safeParseToISO(input);
  if (!parsed) {
    // Fallback to current time if cannot parse
    console.warn('Could not parse timestamp, using current time:', input);
    return now();
  }
  return parsed;
}

/**
 * Batch convert array of timestamps
 */
export function batchMigrateTimestamps(inputs: unknown[]): ISOTimestamp[] {
  return inputs.map(migrateTimestamp);
}

// ============================================
// DEBUGGING HELPERS
// ============================================

/**
 * Format timestamp for human-readable debug output
 */
export function debugFormat(timestamp: ISOTimestamp | EpochMs): string {
  const iso = typeof timestamp === 'string' ? timestamp : epochToISO(timestamp);
  const date = isoToDate(iso);
  
  return `${iso} (${date.toLocaleString()})`;
}

/**
 * Get timestamp info for debugging
 */
export function debugInfo(timestamp: ISOTimestamp | EpochMs): {
  iso: ISOTimestamp;
  epoch: EpochMs;
  locale: string;
  isPast: boolean;
  isFuture: boolean;
} {
  const iso = typeof timestamp === 'string' ? timestamp : epochToISO(timestamp);
  const epoch = typeof timestamp === 'number' ? timestamp : isoToEpoch(timestamp);
  const date = epochToDate(epoch);
  
  return {
    iso,
    epoch,
    locale: date.toLocaleString(),
    isPast: isPast(iso),
    isFuture: isFuture(iso),
  };
}
