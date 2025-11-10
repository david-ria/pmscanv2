import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { useGroupSettings } from '@/hooks/useGroupSettings';
import { migrateContext } from '@/utils/contextMigration';
import { recordingService } from '@/services/recordingService';

// Helper to get mode-specific localStorage keys
// 🛡️ Use stable groupId from ref to avoid flipping to personal during offline transitions
const getStorageKey = (baseKey: string, groupId?: string | null) => {
  if (groupId) return `group-${groupId}-${baseKey}`;
  return `personal-${baseKey}`;
};

// Helper to detect UUID-like strings
const isUUID = (str: string): boolean => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
};

// One-time migration of old localStorage format to scoped keys
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
    
    localStorage.removeItem('recording-location');
    localStorage.removeItem('recording-activity');
    
    console.log('✅ Migration complete');
  }
};

export interface ScopedRecordingContextValue {
  selectedLocation: string;
  selectedActivity: string;
  setSelectedLocation: (location: string) => void;
  setSelectedActivity: (activity: string) => void;
  isGroupMode: boolean;
  activeGroup: { id: string } | null | undefined;
}

export const ScopedRecordingContext = createContext<ScopedRecordingContextValue | undefined>(undefined);

interface ScopedRecordingProviderProps {
  children: ReactNode;
}

export function ScopedRecordingProvider({ children }: ScopedRecordingProviderProps) {
  const { isGroupMode, activeGroup, getCurrentLocations } = useGroupSettings();
  
  // 🛡️ Track last known groupId to stabilize storage keys during offline/online transitions
  const lastKnownGroupIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (activeGroup?.id) {
      lastKnownGroupIdRef.current = activeGroup.id;
    }
  }, [activeGroup?.id]);

  // Initialize state from scoped localStorage with migration support
  const [selectedLocation, setSelectedLocationState] = useState<string>(() => {
    const storageKey = getStorageKey('recording-location', isGroupMode ? activeGroup?.id : null);
    const saved = localStorage.getItem(storageKey);
    const initial = saved || '';

    const migrationResult = migrateContext(
      initial,
      undefined,
      isGroupMode && activeGroup ? (activeGroup as any).locations : undefined
    );

    if (migrationResult.migrated && migrationResult.location) {
      console.log('🔄 Migrated location on init:', initial, '→', migrationResult.location);
      localStorage.setItem(storageKey, migrationResult.location);
      return migrationResult.location;
    }

    return initial;
  });

  const [selectedActivity, setSelectedActivityState] = useState<string>(() => {
    const storageKey = getStorageKey('recording-activity', isGroupMode ? activeGroup?.id : null);
    const saved = localStorage.getItem(storageKey);
    const initial = saved || '';

    const migrationResult = migrateContext(
      undefined,
      initial,
      isGroupMode && activeGroup ? (activeGroup as any).locations : undefined
    );

    if (migrationResult.migrated && migrationResult.activity) {
      console.log('🔄 Migrated activity on init:', initial, '→', migrationResult.activity);
      localStorage.setItem(storageKey, migrationResult.activity);
      return migrationResult.activity;
    }

    return initial;
  });

  // One-time migration on mount
  useEffect(() => {
    migrateOldStorage(isGroupMode, activeGroup?.id || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🔄 Reload context from localStorage when group/mode changes
  // 🛡️ Use stable groupId to prevent dropping to personal during offline transitions
  useEffect(() => {
    const effectiveGroupId = isGroupMode ? (activeGroup?.id || lastKnownGroupIdRef.current) : null;
    const locationKey = getStorageKey('recording-location', effectiveGroupId);
    const activityKey = getStorageKey('recording-activity', effectiveGroupId);
    
    const savedLocation = localStorage.getItem(locationKey) || '';
    const savedActivity = localStorage.getItem(activityKey) || '';
    
    console.log('🔄 [ScopedRecordingContext] Reloading from localStorage:', {
      groupId: effectiveGroupId || 'personal',
      activeGroupFromHook: activeGroup?.id || 'none',
      lastKnownFromRef: lastKnownGroupIdRef.current || 'none',
      isOnline: navigator.onLine,
      savedLocation: savedLocation || 'EMPTY',
      savedActivity: savedActivity || 'EMPTY'
    });
    
    setSelectedLocationState(savedLocation);
    setSelectedActivityState(savedActivity);
  }, [isGroupMode, activeGroup?.id]);

  // 🧹 Clear selections when recording stops (so fresh recordings start clean)
  useEffect(() => {
    // Subscribe to recording service to detect when recording stops
    const unsubscribe = recordingService.subscribe((state) => {
      // When recording stops, clear the scoped localStorage FOR THIS SESSION
      if (!state.isRecording) {
        const effectiveGroupId = isGroupMode ? (activeGroup?.id || lastKnownGroupIdRef.current) : null;
        const locationKey = getStorageKey('recording-location', effectiveGroupId);
        const activityKey = getStorageKey('recording-activity', effectiveGroupId);
        
        // Only clear if we actually have values
        const hadLocation = localStorage.getItem(locationKey);
        const hadActivity = localStorage.getItem(activityKey);
        
        if (hadLocation || hadActivity) {
          console.log('🧹 [ScopedRecordingContext] Recording stopped, clearing context for next session:', {
            groupId: effectiveGroupId || 'personal',
            clearedLocation: hadLocation || 'none',
            clearedActivity: hadActivity || 'none'
          });
          
          localStorage.removeItem(locationKey);
          localStorage.removeItem(activityKey);
          
          // Also clear in-memory state
          setSelectedLocationState('');
          setSelectedActivityState('');
        }
      }
    });
    
    return () => unsubscribe();
  }, [isGroupMode, activeGroup?.id]);

  // Debounced validation when mode/group changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const availableLocations = getCurrentLocations();

      // 🛡️ Skip validation if locations aren't loaded yet OR if we're offline with known groupId
      // This prevents losing selection when going offline temporarily
      if (!availableLocations || availableLocations.length === 0) {
        const hasKnownGroup = isGroupMode && (activeGroup?.id || lastKnownGroupIdRef.current);
        if (!navigator.onLine && hasKnownGroup) {
          console.log('🌐 [ScopedRecordingContext] Offline with known group, preserving selection');
          return;
        }
        console.log('⏸️ [ScopedRecordingContext] Locations not ready yet, skipping validation');
        return;
      }

      if (selectedLocation) {
        const location = availableLocations.find((loc: any) =>
          loc.name === selectedLocation || ('id' in loc && loc.id === selectedLocation)
        );

        if (!location) {
          console.log(`⚠️ Location "${selectedLocation}" not available in current mode. Clearing...`);
          setSelectedLocationState('');
          const effectiveGroupId = isGroupMode ? (activeGroup?.id || lastKnownGroupIdRef.current) : null;
          const storageKey = getStorageKey('recording-location', effectiveGroupId);
          localStorage.removeItem(storageKey);
        } else {
          const hasInvalidName =
            !location.name ||
            isUUID(location.name) ||
            location.name === '0' ||
            /^\d+$/.test(location.name) ||
            location.name.length < 2;
          if (hasInvalidName) {
            console.warn(`⚠️ Location "${selectedLocation}" has invalid name "${location.name}". Clearing...`);
            setSelectedLocationState('');
            const effectiveGroupId = isGroupMode ? (activeGroup?.id || lastKnownGroupIdRef.current) : null;
            const storageKey = getStorageKey('recording-location', effectiveGroupId);
            localStorage.removeItem(storageKey);
          }
        }
      }
    }, 350); // Increased from 100ms to 350ms to ride over re-mounts

    return () => clearTimeout(timeoutId);
  }, [selectedLocation, isGroupMode, activeGroup?.id]);

  // Persist to scoped localStorage
  // 🛡️ Use stable groupId to maintain correct scope
  useEffect(() => {
    if (selectedLocation) {
      const effectiveGroupId = isGroupMode ? (activeGroup?.id || lastKnownGroupIdRef.current) : null;
      const storageKey = getStorageKey('recording-location', effectiveGroupId);
      localStorage.setItem(storageKey, selectedLocation);
    }
  }, [selectedLocation, isGroupMode, activeGroup?.id]);

  useEffect(() => {
    if (selectedActivity) {
      const effectiveGroupId = isGroupMode ? (activeGroup?.id || lastKnownGroupIdRef.current) : null;
      const storageKey = getStorageKey('recording-activity', effectiveGroupId);
      localStorage.setItem(storageKey, selectedActivity);
    }
  }, [selectedActivity, isGroupMode, activeGroup?.id]);

  const setSelectedLocation = useCallback((location: string) => {
    console.log('🔍 [ScopedRecordingProvider] setSelectedLocation:', {
      newValue: location || 'EMPTY',
      oldValue: selectedLocation || 'EMPTY',
      groupId: activeGroup?.id || 'personal',
      timestamp: new Date().toISOString(),
    });
    setSelectedLocationState(location);
  }, [selectedLocation, activeGroup?.id]);

  const setSelectedActivity = useCallback((activity: string) => {
    console.log('🔍 [ScopedRecordingProvider] setSelectedActivity:', {
      newValue: activity || 'EMPTY',
      oldValue: selectedActivity || 'EMPTY',
      groupId: activeGroup?.id || 'personal',
      timestamp: new Date().toISOString(),
    });
    setSelectedActivityState(activity);
  }, [selectedActivity, activeGroup?.id]);

  const value: ScopedRecordingContextValue = {
    selectedLocation,
    selectedActivity,
    setSelectedLocation,
    setSelectedActivity,
    isGroupMode,
    activeGroup: activeGroup ? { id: activeGroup.id } as any : activeGroup,
  };

  return (
    <ScopedRecordingContext.Provider value={value}>
      {children}
    </ScopedRecordingContext.Provider>
  );
}
