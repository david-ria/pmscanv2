/**
 * Timestamp Migration Guide
 * 
 * This file documents the timestamp standardization migration
 * and provides helpers for gradual migration.
 */

import { 
  createISOTimestamp, 
  createEpochMs,
  safeParseToISO,
  type ISOTimestamp,
  type EpochMs 
} from '@/utils/timestamp';
import logger from '@/utils/logger';

/**
 * MIGRATION STRATEGY
 * ==================
 * 
 * Phase 3 introduces branded types for timestamp safety:
 * - ISOTimestamp: For ISO 8601 strings (YYYY-MM-DDTHH:mm:ss.sssZ)
 * - EpochMs: For Unix epoch milliseconds
 * 
 * OLD PATTERNS TO REPLACE:
 * 
 * ❌ Date.now()
 * ✅ createEpochMs() or nowEpochMs()
 * 
 * ❌ new Date().toISOString()
 * ✅ createISOTimestamp() or now()
 * 
 * ❌ someDate.getTime()
 * ✅ createEpochMs(someDate)
 * 
 * ❌ new Date(timestamp)
 * ✅ isoToDate(timestamp) or epochToDate(timestamp)
 * 
 * GRADUAL MIGRATION:
 * 
 * 1. Services layer (DONE ✅)
 *    - hybridStorageService
 *    - rollingBufferService
 *    - recordingService
 *    - weatherService
 *    - motionWalkingSignature
 * 
 * 2. Library layer (TODO)
 *    - dataStorage.ts
 *    - dataSync.ts
 *    - missionManager.ts
 *    - cookingFeatures.ts
 *    - csvExport.ts
 * 
 * 3. Components layer (TODO)
 *    - UnifiedDataProvider
 *    - GlobalDataCollector
 *    - History components
 * 
 * 4. Database migrations (FUTURE)
 *    - Add timestamp validation triggers
 *    - Ensure all DB timestamps are timestamptz
 */

/**
 * Migrate legacy timestamp data to new format
 */
export function migrateLegacyTimestamp(value: unknown): ISOTimestamp {
  const parsed = safeParseToISO(value);
  
  if (!parsed) {
    logger.warn('Failed to migrate timestamp, using current time:', value);
    return createISOTimestamp();
  }
  
  return parsed;
}

/**
 * Batch migrate an array of objects with timestamp fields
 */
export function batchMigrateTimestamps<T extends Record<string, any>>(
  objects: T[],
  timestampFields: (keyof T)[]
): T[] {
  return objects.map(obj => {
    const migrated = { ...obj };
    
    for (const field of timestampFields) {
      if (obj[field] !== undefined && obj[field] !== null) {
        migrated[field] = migrateLegacyTimestamp(obj[field]) as any;
      }
    }
    
    return migrated;
  });
}

/**
 * Check if codebase uses consistent timestamps
 * Run this in dev console to audit timestamp usage
 */
export function auditTimestampConsistency(): {
  totalChecked: number;
  issues: string[];
  recommendations: string[];
} {
  const issues: string[] = [];
  const recommendations: string[] = [];
  let totalChecked = 0;
  
  // Check localStorage
  try {
    const missions = localStorage.getItem('pmscan_missions');
    if (missions) {
      const parsed = JSON.parse(missions);
      totalChecked += parsed.length || 0;
      
      if (Array.isArray(parsed)) {
        parsed.forEach((mission: any, idx: number) => {
          if (mission.startTime && typeof mission.startTime !== 'string') {
            issues.push(`Mission ${idx} startTime is not ISO string: ${typeof mission.startTime}`);
          }
          if (mission.timestamp && typeof mission.timestamp === 'number') {
            recommendations.push(`Consider converting mission ${idx} timestamp to ISO format`);
          }
        });
      }
    }
  } catch (error) {
    logger.error('Failed to audit localStorage timestamps', error);
  }
  
  return {
    totalChecked,
    issues,
    recommendations,
  };
}

/**
 * USAGE EXAMPLES
 * ==============
 */

// Example 1: Creating timestamps
function exampleCreateTimestamps() {
  // ✅ Current time
  const now1 = createISOTimestamp();
  const now2 = createEpochMs();
  
  // ✅ From specific date
  const specific = createISOTimestamp(new Date('2024-01-01'));
  
  // ✅ From string
  const fromString = createISOTimestamp('2024-01-01T12:00:00Z');
  
  return { now1, now2, specific, fromString };
}

// Example 2: Converting timestamps
function exampleConvertTimestamps() {
  const iso: ISOTimestamp = createISOTimestamp();
  const epoch: EpochMs = createEpochMs();
  
  // ✅ ISO to Epoch
  // const epochFromIso = isoToEpoch(iso);
  
  // ✅ Epoch to ISO
  // const isoFromEpoch = epochToISO(epoch);
  
  return { iso, epoch };
}

// Example 3: Safe parsing
function exampleSafeParsing() {
  // ✅ Parse unknown input
  const parsed1 = safeParseToISO('2024-01-01');
  const parsed2 = safeParseToISO(1704067200000);
  const parsed3 = safeParseToISO(new Date());
  
  return { parsed1, parsed2, parsed3 };
}

export const examples = {
  create: exampleCreateTimestamps,
  convert: exampleConvertTimestamps,
  parse: exampleSafeParsing,
};
