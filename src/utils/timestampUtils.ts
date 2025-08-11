/**
 * Timestamp utilities with numeric epoch caching
 * Cache only numeric epochs to avoid Date object churn
 */

import { toEpochMs } from '@/lib/time';

// Cache for epoch conversions to avoid repeated processing
const epochCache = new Map<string, number>();

function cacheKey(input: Date | number | string): string {
  if (typeof input === 'number') return `n:${input}`;
  if (input instanceof Date) return `d:${input.getTime()}`;
  // canonicalize strings (trim, use ISO if parsable)
  const t = Date.parse(input);
  return Number.isNaN(t) ? `s:${input.trim()}` : `siso:${new Date(t).toISOString()}`;
}

/**
 * Converts any timestamp format to numeric epoch with caching
 */
export function ensureEpochMs(timestamp: Date | number | string): number {
  if (typeof timestamp === 'number') return timestamp;
  const key = cacheKey(timestamp);
  const hit = epochCache.get(key);
  if (hit != null) return hit;
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
  const VOLATILE = new Set(['timestamp', 'monotonic', 'id', 'createdAt', 'updatedAt']);
  const seen = new WeakSet<object>();

  const clean = (v: any): any => {
    if (v == null || typeof v !== 'object') return v;
    if (seen.has(v)) return null;
    seen.add(v);

    if (Array.isArray(v)) return v.map(clean);

    const out: Record<string, any> = {};
    for (const [k, val] of Object.entries(v)) {
      if (VOLATILE.has(k)) continue;
      out[k] = clean(val);
    }
    return out;
  };

  return JSON.stringify(clean(obj));
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