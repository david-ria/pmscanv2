import { useState, useEffect, useCallback } from 'react';
import { useGroupSettings } from './useGroupSettings';
import { useUnifiedData } from '@/components/UnifiedDataProvider';
import { migrateContext } from '@/utils/contextMigration';

/**
 * Helper to get mode-specific localStorage keys
 * Prevents cross-contamination between personal and group modes
 */
const getStorageKey = (baseKey: string, groupId?: string | null) => {
  if (groupId) return `group-${groupId}-${baseKey}`;
  return `personal-${baseKey}`;
};

/**
 * Helper to detect UUID-like strings (common invalid leftover values)
 */
const isUUID = (str: string): boolean => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
};

/**
 * One-time migration of old localStorage format to scoped keys
 */
const migrateOldStorage = (isGroupMode: boolean, activeGroupId: string | null) => {
  const oldLocation = localStorage.getItem('recording-location');
  const oldActivity = localStorage.getItem('recording-activity');
  
  if (oldLocation || oldActivity) {
    console.log('🔄 Migrating old localStorage to scoped keys...');
    
    if (oldLocation) {
      const targetKey = getStorageKey('recording-location', isGroupMode ? activeGroupId : null);
      localStorage.setItem(targetKey, oldLocation);
    }
    if (oldActivity) {
      const targetKey = getStorageKey('recording-activity', isGroupMode ? activeGroupId : null);
      localStorage.setItem(targetKey, oldActivity);
    }
    
    // Remove old keys
    localStorage.removeItem('recording-location');
    localStorage.removeItem('recording-activity');
    
    console.log('✅ Migration complete');
  }
};

/**
 * Shared hook for managing scoped recording context (location + activity)
 * Ensures consistent behavior across RealTime and GlobalDataCollector
 * 
 * Features:
 * - Mode-scoped localStorage keys (personal vs group)
 * - Auto-migration of legacy keys
 * - Validation and auto-cleanup of invalid selections
 * - Prevents UUID leakage and cross-mode contamination
 */
export function useScopedRecordingContext() {
  const { isGroupMode, activeGroup, getCurrentLocations } = useGroupSettings();
  const { missionContext } = useUnifiedData();
  
  // Initialize state from scoped localStorage with migration support
  const [selectedLocation, setSelectedLocationState] = useState<string>(() => {
    const storageKey = getStorageKey('recording-location', isGroupMode ? activeGroup?.id : null);
    const saved = localStorage.getItem(storageKey);
    const initial = saved || missionContext.location || '';
    
    // Migrate if it looks like an ID (pass locations from GroupConfig)
    const migrationResult = migrateContext(
      initial, 
      undefined, 
      isGroupMode && activeGroup ? activeGroup.locations : undefined
    );
    
    if (migrationResult.migrated && migrationResult.location) {
      console.log('🔄 Migrated location on init:', initial, '→', migrationResult.location);
      // Update localStorage with migrated value
      localStorage.setItem(storageKey, migrationResult.location);
      return migrationResult.location;
    }
    
    return initial;
  });

  const [selectedActivity, setSelectedActivityState] = useState<string>(() => {
    const storageKey = getStorageKey('recording-activity', isGroupMode ? activeGroup?.id : null);
    const saved = localStorage.getItem(storageKey);
    const initial = saved || missionContext.activity || '';
    
    // Migrate if it looks like an ID (pass locations from GroupConfig)
    const migrationResult = migrateContext(
      undefined,
      initial, 
      isGroupMode && activeGroup ? activeGroup.locations : undefined
    );
    
    if (migrationResult.migrated && migrationResult.activity) {
      console.log('🔄 Migrated activity on init:', initial, '→', migrationResult.activity);
      // Update localStorage with migrated value
      localStorage.setItem(storageKey, migrationResult.activity);
      return migrationResult.activity;
    }
    
    return initial;
  });

  // One-time migration on mount
  useEffect(() => {
    migrateOldStorage(isGroupMode, activeGroup?.id || null);
  }, []); // Run once only

  // Validate and cleanup invalid selections (runs on mount AND when mode/group changes)
  useEffect(() => {
    const availableLocations = getCurrentLocations();
    
    if (selectedLocation) {
      // Find the location by name (since we now store names, not IDs)
      const location = availableLocations.find(loc => 
        loc.name === selectedLocation || 
        ('id' in loc && loc.id === selectedLocation) // Backwards compatibility
      );
      
      // Check if location exists
      if (!location) {
        console.log(`⚠️ Location "${selectedLocation}" not available in current mode. Clearing...`);
        setSelectedLocationState('');
        const storageKey = getStorageKey('recording-location', isGroupMode ? activeGroup?.id : null);
        localStorage.removeItem(storageKey);
        return;
      }
      
      // Additional validation: ensure the location has a valid name
      const hasInvalidName = 
        !location.name || 
        isUUID(location.name) || // Name is a UUID
        location.name === "0" || // Name is numeric string "0"
        /^\d+$/.test(location.name) || // Name is only digits
        location.name.length < 2; // Name too short
      
      if (hasInvalidName) {
        console.warn(`⚠️ Location "${selectedLocation}" has invalid name "${location.name}". Clearing...`);
        setSelectedLocationState('');
        const storageKey = getStorageKey('recording-location', isGroupMode ? activeGroup?.id : null);
        localStorage.removeItem(storageKey);
      }
    }
  }, [selectedLocation, isGroupMode, activeGroup?.id, getCurrentLocations]);

  // Persist location to scoped localStorage
  useEffect(() => {
    if (selectedLocation) {
      const storageKey = getStorageKey('recording-location', isGroupMode ? activeGroup?.id : null);
      localStorage.setItem(storageKey, selectedLocation);
    }
  }, [selectedLocation, isGroupMode, activeGroup?.id]);

  // Persist activity to scoped localStorage
  useEffect(() => {
    if (selectedActivity) {
      const storageKey = getStorageKey('recording-activity', isGroupMode ? activeGroup?.id : null);
      localStorage.setItem(storageKey, selectedActivity);
    }
  }, [selectedActivity, isGroupMode, activeGroup?.id]);

  // Wrapped setters for external use
  const setSelectedLocation = useCallback((location: string) => {
    setSelectedLocationState(location);
  }, []);

  const setSelectedActivity = useCallback((activity: string) => {
    setSelectedActivityState(activity);
  }, []);

  return {
    selectedLocation,
    selectedActivity,
    setSelectedLocation,
    setSelectedActivity,
    isGroupMode,
    activeGroup,
  };
}
