/**
 * Context Migration Utilities
 * Converts legacy IDs to human-readable names for location/activity context
 */

import { DEFAULT_LOCATIONS } from '@/lib/locationsActivities';
import * as logger from '@/utils/logger';

export interface MigrationResult {
  location?: string;
  activity?: string;
  migrated: boolean;
}

/**
 * Check if a string looks like an ID (UUID, kebab-case, or numeric)
 */
function looksLikeId(value: string): boolean {
  if (!value) return false;
  
  // UUID pattern
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidPattern.test(value)) return true;
  
  // Kebab-case pattern (gare-de-lyon, walk, rame)
  if (/^[a-z0-9]+(-[a-z0-9]+)*$/.test(value)) return true;
  
  // Numeric string (0, 1, 2)
  if (/^\d+$/.test(value)) return true;
  
  return false;
}

/**
 * Find the human-readable name for a location ID
 */
function resolveLocationName(locationId: string, customLocations?: any): string | undefined {
  // Try custom locations first (from group or profile)
  if (customLocations) {
    // Handle array format
    if (Array.isArray(customLocations)) {
      const location = customLocations.find(loc => 
        loc.id === locationId || loc.name === locationId
      );
      if (location) return location.name;
    }
    
    // Handle record/object format
    if (typeof customLocations === 'object') {
      // Check if it's the hierarchical format
      for (const [key, value] of Object.entries(customLocations)) {
        if (key === locationId) {
          if (typeof value === 'object' && value !== null && 'name' in value) {
            return (value as any).name;
          }
        }
        // Also check by name in the value
        if (typeof value === 'object' && value !== null && 'name' in value) {
          if ((value as any).name === locationId) {
            return (value as any).name;
          }
        }
      }
    }
  }
  
  // Try default locations
  const defaultLocation = DEFAULT_LOCATIONS.find(loc => 
    loc.id === locationId || loc.name === locationId
  );
  if (defaultLocation) return defaultLocation.name;
  
  return undefined;
}

/**
 * Find the human-readable name for an activity ID
 */
function resolveActivityName(activityId: string, customLocations?: any): string | undefined {
  // Try custom locations first (from group or profile)
  if (customLocations) {
    // Handle array format
    if (Array.isArray(customLocations)) {
      for (const location of customLocations) {
        if (location.activities) {
          const activity = location.activities.find((act: any) => 
            act.id === activityId || act.name === activityId
          );
          if (activity) return activity.name;
        }
      }
    }
    
    // Handle record/object format
    if (typeof customLocations === 'object') {
      for (const value of Object.values(customLocations)) {
        if (typeof value === 'object' && value !== null && 'activities' in value) {
          const activities = (value as any).activities;
          if (Array.isArray(activities)) {
            const activity = activities.find((act: any) => 
              act.id === activityId || act.name === activityId
            );
            if (activity) return activity.name;
          }
        }
      }
    }
  }
  
  // Try default locations
  for (const location of DEFAULT_LOCATIONS) {
    if (location.activities) {
      const activity = location.activities.find(act => 
        act.id === activityId || act.name === activityId
      );
      if (activity) return activity.name;
    }
  }
  
  return undefined;
}

/**
 * Migrate context from IDs to human-readable names
 */
export function migrateContext(
  locationContext?: string,
  activityContext?: string,
  customLocations?: any
): MigrationResult {
  let migratedLocation = locationContext;
  let migratedActivity = activityContext;
  let migrated = false;
  
  // Migrate location if it looks like an ID
  if (locationContext && looksLikeId(locationContext)) {
    const resolvedName = resolveLocationName(locationContext, customLocations);
    if (resolvedName) {
      logger.debug(`📝 Migrating location: "${locationContext}" → "${resolvedName}"`);
      migratedLocation = resolvedName;
      migrated = true;
    } else {
      logger.debug(`⚠️ Could not resolve location ID: "${locationContext}"`);
    }
  }
  
  // Migrate activity if it looks like an ID
  if (activityContext && looksLikeId(activityContext)) {
    const resolvedName = resolveActivityName(activityContext, customLocations);
    if (resolvedName) {
      logger.debug(`📝 Migrating activity: "${activityContext}" → "${resolvedName}"`);
      migratedActivity = resolvedName;
      migrated = true;
    } else {
      logger.debug(`⚠️ Could not resolve activity ID: "${activityContext}"`);
    }
  }
  
  return {
    location: migratedLocation,
    activity: migratedActivity,
    migrated
  };
}

/**
 * Migrate context for a batch of measurements
 */
export function migrateMeasurementsContext(
  measurements: any[],
  customLocations?: any
): any[] {
  if (!measurements || measurements.length === 0) return measurements;
  
  return measurements.map(measurement => {
    const result = migrateContext(
      measurement.locationContext,
      measurement.activityContext,
      customLocations
    );
    
    if (result.migrated) {
      return {
        ...measurement,
        locationContext: result.location,
        activityContext: result.activity
      };
    }
    
    return measurement;
  });
}
