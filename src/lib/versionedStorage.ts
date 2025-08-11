/**
 * Versioned and validated localStorage utilities
 * Prevents stale/broken state after releases with proper migration
 */

import { z } from 'zod';
import * as logger from '@/utils/logger';

// Current schema version - increment when breaking changes are made
export const STORAGE_VERSION = 3;

// Interface for versioned storage
interface VersionedStorage<T> {
  version: number;
  data: T;
  timestamp: number;
}

// Storage keys registry with their schemas
export const STORAGE_KEYS = {
  // Mission data
  MISSIONS: 'pmscan_missions_v3',
  PENDING_SYNC: 'pmscan_pending_sync_v3',
  
  // User preferences
  ALERT_SETTINGS: 'alertSettings_v3',
  GLOBAL_ALERTS_ENABLED: 'globalAlertsEnabled_v3',
  AIR_QUALITY_THRESHOLDS: 'airQualityThresholds_v3',
  
  // App state
  BACKGROUND_RECORDING: 'pmscan-background-enabled_v3',
  RECORDING_CONFIRMED: 'recording-confirmed_v3',
  MAPBOX_PREFERENCE: 'mapbox-user-preference_v3',
  WEATHER_LOGGING: 'weatherLogging_v3',
  
  // Group settings
  ACTIVE_GROUP_ID: 'activeGroupId_v3',
  GROUP_SETTINGS: 'groupSettings_v3',
  
  // Auto context
  AUTO_CONTEXT_RULES: 'autoContextRules_v3',
  AUTO_CONTEXT_TIME_TRACKING: 'autoContextTimeTracking_v3',
  
  // Recovery data
  CRASH_RECOVERY: 'pmscan_crash_recovery_v3',
  UNSENT_CSV: 'pmscan_unsent_csv_v3',
  
  // Events
  PENDING_EVENTS: 'pending_events_v3',
  
  // Global state
  GLOBAL_STATE: 'globalState_v3',
} as const;

// Migration strategies
type MigrationStrategy = 'reset' | 'migrate' | 'keep';

interface StorageConfig<T> {
  schema: z.ZodType<T>;
  migrationStrategy: MigrationStrategy;
  migrator?: (oldData: unknown, oldVersion: number) => T;
}

// Define schemas for each storage type
export const STORAGE_SCHEMAS = {
  MISSIONS: z.array(z.object({
    id: z.string(),
    name: z.string(),
    startTime: z.date(),
    endTime: z.date(),
    durationMinutes: z.number(),
    avgPm1: z.number(),
    avgPm25: z.number(),
    avgPm10: z.number(),
    maxPm25: z.number(),
    measurementsCount: z.number(),
    locationContext: z.string().optional(),
    activityContext: z.string().optional(),
    recordingFrequency: z.string().optional(),
    shared: z.boolean().optional(),
    weatherDataId: z.string().optional(),
    airQualityDataId: z.string().optional(),
    synced: z.boolean().optional(),
    measurements: z.array(z.object({
      id: z.string(),
      timestamp: z.date(),
      pm1: z.number(),
      pm25: z.number(),
      pm10: z.number(),
      temperature: z.number().optional(),
      humidity: z.number().optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      accuracy: z.number().optional(),
      locationContext: z.string().optional(),
      activityContext: z.string().optional(),
      automaticContext: z.string().optional(),
    })),
  })),
  
  PENDING_SYNC: z.array(z.string()),
  
  ALERT_SETTINGS: z.record(z.object({
    pm1: z.number().optional(),
    pm25: z.number(),
    pm10: z.number(),
    enabled: z.boolean(),
  })),
  
  GLOBAL_ALERTS_ENABLED: z.boolean(),
  
  AIR_QUALITY_THRESHOLDS: z.object({
    pm25: z.object({
      good: z.number(),
      moderate: z.number(),
      poor: z.number(),
    }),
    pm10: z.object({
      good: z.number(),
      moderate: z.number(),
      poor: z.number(),
    }),
  }),
  
  BACKGROUND_RECORDING: z.boolean(),
  RECORDING_CONFIRMED: z.boolean(),
  MAPBOX_PREFERENCE: z.enum(['enabled', 'disabled']),
  WEATHER_LOGGING: z.boolean(),
  
  ACTIVE_GROUP_ID: z.string(),
  GROUP_SETTINGS: z.record(z.unknown()),
  
  AUTO_CONTEXT_RULES: z.array(z.object({
    id: z.string(),
    name: z.string(),
    conditions: z.array(z.unknown()),
    action: z.object({
      type: z.string(),
      value: z.string(),
    }),
    enabled: z.boolean(),
  })),
  
  AUTO_CONTEXT_TIME_TRACKING: z.record(z.unknown()),
  
  CRASH_RECOVERY: z.object({
    missionId: z.string(),
    measurements: z.array(z.unknown()),
    startTime: z.number(),
    lastSave: z.number(),
  }),
  
  UNSENT_CSV: z.array(z.object({
    filename: z.string(),
    data: z.string(),
    timestamp: z.number(),
  })),
  
  PENDING_EVENTS: z.array(z.object({
    id: z.string(),
    missionId: z.string(),
    eventType: z.string(),
    timestamp: z.number(),
    metadata: z.record(z.unknown()).optional(),
  })),
  
  GLOBAL_STATE: z.record(z.unknown()),
} as const;

/**
 * Safe localStorage getter with versioning and validation
 */
export function getVersionedItem<T>(
  key: keyof typeof STORAGE_KEYS,
  config: StorageConfig<T>
): T | null {
  try {
    const storageKey = STORAGE_KEYS[key];
    const raw = localStorage.getItem(storageKey);
    
    if (!raw) {
      logger.debug(`No stored data found for key: ${key}`);
      return null;
    }

    const parsed: VersionedStorage<unknown> = JSON.parse(raw);
    
    // Check version compatibility
    if (parsed.version !== STORAGE_VERSION) {
      logger.debug(`Version mismatch for ${key}: stored=${parsed.version}, current=${STORAGE_VERSION}`);
      
      switch (config.migrationStrategy) {
        case 'reset':
          logger.info(`Resetting storage for ${key} due to version mismatch`);
          localStorage.removeItem(storageKey);
          return null;
          
        case 'migrate':
          if (config.migrator) {
            try {
              const migrated = config.migrator(parsed.data, parsed.version);
              const validated = config.schema.parse(migrated);
              logger.info(`Successfully migrated ${key} from version ${parsed.version} to ${STORAGE_VERSION}`);
              
              // Save migrated data
              setVersionedItem(key, validated);
              return validated;
            } catch (migrationError) {
              logger.error(`Migration failed for ${key}:`, migrationError);
              localStorage.removeItem(storageKey);
              return null;
            }
          }
          // Fall through to reset if no migrator provided
          logger.warn(`No migrator provided for ${key}, resetting data`);
          localStorage.removeItem(storageKey);
          return null;
          
        case 'keep':
          logger.debug(`Keeping existing data for ${key} despite version mismatch`);
          break;
          
        default:
          logger.warn(`Unknown migration strategy for ${key}, resetting data`);
          localStorage.removeItem(storageKey);
          return null;
      }
    }

    // Validate data structure
    try {
      const validated = config.schema.parse(parsed.data);
      return validated;
    } catch (validationError) {
      logger.error(`Schema validation failed for ${key}:`, validationError);
      
      // Provide fallback defaults for critical data types
      if (key === 'ALERT_SETTINGS') {
        const defaultAlertSettings = {
          pm1: { pm1: 10, pm25: 15, pm10: 20, enabled: false },
          pm25: { pm1: 15, pm25: 25, pm10: 35, enabled: false },
          pm10: { pm1: 25, pm25: 35, pm10: 50, enabled: false }
        };
        logger.info(`Using default alert settings for ${key}`);
        setVersionedItem(key, defaultAlertSettings as T);
        return defaultAlertSettings as T;
      }
      
      // Clean up corrupted data for other types
      localStorage.removeItem(STORAGE_KEYS[key]);
      return null;
    }
    
  } catch (error) {
    logger.error(`Failed to parse stored data for ${key}:`, error);
    
    // Provide fallback defaults for critical data types
    if (key === 'ALERT_SETTINGS') {
      const defaultAlertSettings = {
        pm1: { pm1: 10, pm25: 15, pm10: 20, enabled: false },
        pm25: { pm1: 15, pm25: 25, pm10: 35, enabled: false },
        pm10: { pm1: 25, pm25: 35, pm10: 50, enabled: false }
      };
      logger.info(`Using default alert settings after parse error for ${key}`);
      setVersionedItem(key, defaultAlertSettings as T);
      return defaultAlertSettings as T;
    }
    
    // Clean up corrupted data
    try {
      localStorage.removeItem(STORAGE_KEYS[key]);
    } catch (cleanupError) {
      logger.error(`Failed to clean up corrupted data for ${key}:`, cleanupError);
    }
    
    return null;
  }
}

/**
 * Safe localStorage setter with versioning
 */
export function setVersionedItem<T>(
  key: keyof typeof STORAGE_KEYS,
  data: T
): void {
  try {
    const storageKey = STORAGE_KEYS[key];
    const versionedData: VersionedStorage<T> = {
      version: STORAGE_VERSION,
      data,
      timestamp: Date.now(),
    };
    
    localStorage.setItem(storageKey, JSON.stringify(versionedData));
    logger.debug(`Successfully stored versioned data for ${key}`);
    
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      logger.warn(`Storage quota exceeded for ${key}, attempting cleanup...`);
      
      // Attempt cleanup and retry
      cleanupOldVersionedData();
      try {
        const versionedData: VersionedStorage<T> = {
          version: STORAGE_VERSION,
          data,
          timestamp: Date.now(),
        };
        localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(versionedData));
        logger.info(`Successfully stored data for ${key} after cleanup`);
      } catch (retryError) {
        logger.error(`Failed to store data for ${key} even after cleanup:`, retryError);
        throw retryError;
      }
    } else {
      logger.error(`Failed to store data for ${key}:`, error);
      throw error;
    }
  }
}

/**
 * Remove versioned item from localStorage
 */
export function removeVersionedItem(key: keyof typeof STORAGE_KEYS): void {
  try {
    localStorage.removeItem(STORAGE_KEYS[key]);
    logger.debug(`Removed versioned data for ${key}`);
  } catch (error) {
    logger.error(`Failed to remove data for ${key}:`, error);
  }
}

/**
 * Cleanup old version data and orphaned keys
 */
export function cleanupOldVersionedData(): void {
  try {
    const keysToRemove: string[] = [];
    
    // Find old version keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        // Remove old version keys that don't match current pattern
        if (key.includes('_v1') || key.includes('_v2') || 
            (!key.includes('_v3') && Object.values(STORAGE_KEYS).some(storageKey => 
              key.startsWith(storageKey.replace('_v3', ''))))) {
          keysToRemove.push(key);
        }
      }
    }
    
    // Remove old keys
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
        logger.debug(`Cleaned up old storage key: ${key}`);
      } catch (error) {
        logger.warn(`Failed to clean up key ${key}:`, error);
      }
    });
    
    logger.info(`Cleaned up ${keysToRemove.length} old storage keys`);
    
  } catch (error) {
    logger.error('Failed to cleanup old versioned data:', error);
  }
}

/**
 * Get storage info for debugging
 */
export function getStorageInfo(): {
  version: number;
  keys: string[];
  totalSize: number;
  keyDetails: Array<{ key: string; size: number; version?: number }>;
} {
  const keys: string[] = [];
  const keyDetails: Array<{ key: string; size: number; version?: number }> = [];
  let totalSize = 0;
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      keys.push(key);
      const value = localStorage.getItem(key) || '';
      const size = new Blob([value]).size;
      totalSize += size;
      
      // Try to get version info
      let version: number | undefined;
      try {
        const parsed = JSON.parse(value);
        if (parsed && typeof parsed.version === 'number') {
          version = parsed.version;
        }
      } catch {
        // Not versioned data
      }
      
      keyDetails.push({ key, size, version });
    }
  }
  
  return {
    version: STORAGE_VERSION,
    keys,
    totalSize,
    keyDetails,
  };
}