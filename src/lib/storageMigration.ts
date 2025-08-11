/**
 * Migration utilities for converting legacy localStorage usage to versioned storage
 */

import { getVersionedItem, setVersionedItem, removeVersionedItem, STORAGE_SCHEMAS } from './versionedStorage';
import * as logger from '@/utils/logger';

// Legacy storage key mappings
const LEGACY_KEY_MAPPINGS = {
  'alertSettings': 'ALERT_SETTINGS',
  'globalAlertsEnabled': 'GLOBAL_ALERTS_ENABLED',
  'airQualityThresholds': 'AIR_QUALITY_THRESHOLDS',
  'pmscan-background-enabled': 'BACKGROUND_RECORDING',
  'recording-confirmed': 'RECORDING_CONFIRMED',
  'mapbox-user-preference': 'MAPBOX_PREFERENCE',
  'weatherLogging': 'WEATHER_LOGGING',
  'activeGroupId': 'ACTIVE_GROUP_ID',
  'groupSettings': 'GROUP_SETTINGS',
  'autoContextRules': 'AUTO_CONTEXT_RULES',
  'autoContextTimeTracking': 'AUTO_CONTEXT_TIME_TRACKING',
  'pmscan_crash_recovery': 'CRASH_RECOVERY',
  'pmscan_unsent_csv': 'UNSENT_CSV',
  'pending_events': 'PENDING_EVENTS',
  'globalState': 'GLOBAL_STATE',
} as const;

/**
 * Get item with automatic migration from legacy storage
 */
export function getMigratedItem<K extends keyof typeof LEGACY_KEY_MAPPINGS>(
  legacyKey: K,
  defaultValue?: any
): any {
  const storageKey = LEGACY_KEY_MAPPINGS[legacyKey];
  
  try {
    // Try versioned storage first
    const versionedData = getVersionedItem(storageKey as any, {
      schema: (STORAGE_SCHEMAS as any)[storageKey] || require('zod').unknown(),
      migrationStrategy: 'migrate',
      migrator: (oldData: unknown) => {
        logger.info(`Migrating ${legacyKey} to versioned storage`);
        
        // Handle specific data type conversions
        switch (legacyKey) {
          case 'globalAlertsEnabled':
          case 'pmscan-background-enabled':
          case 'recording-confirmed':
          case 'weatherLogging':
            return typeof oldData === 'string' ? oldData === 'true' : Boolean(oldData);
            
          case 'alertSettings':
          case 'airQualityThresholds':
          case 'groupSettings':
          case 'autoContextRules':
          case 'autoContextTimeTracking':
          case 'pmscan_crash_recovery':
          case 'pmscan_unsent_csv':
          case 'pending_events':
          case 'globalState':
            return oldData;
            
          case 'mapbox-user-preference':
            return oldData === 'enabled' ? 'enabled' : 'disabled';
            
          case 'activeGroupId':
            return String(oldData);
            
          default:
            return oldData;
        }
      },
    });

    if (versionedData !== null) {
      return versionedData;
    }

    // Try legacy storage
    const legacyData = localStorage.getItem(legacyKey);
    if (legacyData === null) {
      return defaultValue;
    }

    let parsed;
    try {
      parsed = JSON.parse(legacyData);
    } catch {
      // Handle non-JSON values
      parsed = legacyData;
    }

    // Apply same conversion logic
    let converted;
    switch (legacyKey) {
      case 'globalAlertsEnabled':
      case 'pmscan-background-enabled':
      case 'recording-confirmed':
      case 'weatherLogging':
        converted = legacyData === 'true';
        break;
        
      case 'mapbox-user-preference':
        converted = legacyData === 'enabled' ? 'enabled' : 'disabled';
        break;
        
      default:
        converted = parsed;
    }

    // Migrate to versioned storage
    setVersionedItem(storageKey as any, converted);
    
    // Clean up legacy key
    localStorage.removeItem(legacyKey);
    
    logger.info(`Migrated ${legacyKey} to versioned storage`);
    
    return converted;
    
  } catch (error) {
    logger.error(`Failed to migrate ${legacyKey}:`, error);
    return defaultValue;
  }
}

/**
 * Set item in versioned storage
 */
export function setMigratedItem<K extends keyof typeof LEGACY_KEY_MAPPINGS>(
  legacyKey: K,
  value: any
): void {
  const storageKey = LEGACY_KEY_MAPPINGS[legacyKey];
  
  try {
    setVersionedItem(storageKey as any, value);
    
    // Clean up any legacy key that might exist
    if (localStorage.getItem(legacyKey)) {
      localStorage.removeItem(legacyKey);
    }
  } catch (error) {
    logger.error(`Failed to set versioned item for ${legacyKey}:`, error);
    throw error;
  }
}

/**
 * Remove item from versioned storage
 */
export function removeMigratedItem<K extends keyof typeof LEGACY_KEY_MAPPINGS>(
  legacyKey: K
): void {
  const storageKey = LEGACY_KEY_MAPPINGS[legacyKey];
  
  try {
    removeVersionedItem(storageKey as any);
    
    // Also clean up legacy key
    localStorage.removeItem(legacyKey);
  } catch (error) {
    logger.error(`Failed to remove versioned item for ${legacyKey}:`, error);
  }
}

/**
 * Batch migrate all legacy storage to versioned storage
 */
export function migrateAllLegacyStorage(): void {
  logger.info('Starting migration of all legacy storage to versioned storage');
  
  let migratedCount = 0;
  let errorCount = 0;
  
  Object.keys(LEGACY_KEY_MAPPINGS).forEach((legacyKey) => {
    try {
      const key = legacyKey as keyof typeof LEGACY_KEY_MAPPINGS;
      const existingData = localStorage.getItem(key);
      
      if (existingData !== null) {
        getMigratedItem(key); // This will trigger migration
        migratedCount++;
      }
    } catch (error) {
      logger.error(`Failed to migrate ${legacyKey}:`, error);
      errorCount++;
    }
  });
  
  logger.info(`Migration completed: ${migratedCount} items migrated, ${errorCount} errors`);
}

/**
 * Check if migration is needed
 */
export function needsMigration(): boolean {
  return Object.keys(LEGACY_KEY_MAPPINGS).some(key => 
    localStorage.getItem(key) !== null
  );
}

/**
 * Get migration status for debugging
 */
export function getMigrationStatus(): {
  needsMigration: boolean;
  legacyKeys: string[];
  versionedKeys: string[];
} {
  const legacyKeys = Object.keys(LEGACY_KEY_MAPPINGS).filter(key => 
    localStorage.getItem(key) !== null
  );
  
  const versionedKeys = Object.values(LEGACY_KEY_MAPPINGS).filter(storageKey => {
    try {
      const versionedData = getVersionedItem(storageKey as any, {
        schema: require('zod').unknown(),
        migrationStrategy: 'keep',
      });
      return versionedData !== null;
    } catch {
      return false;
    }
  });
  
  return {
    needsMigration: legacyKeys.length > 0,
    legacyKeys,
    versionedKeys,
  };
}