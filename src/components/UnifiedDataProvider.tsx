import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useActiveSensor } from '@/hooks/useActiveSensor';
import { useRecordingService } from '@/hooks/useRecordingService';
import { useMissionSaver } from '@/hooks/useMissionSaver';
import { useCrashRecovery } from '@/hooks/useCrashRecovery';
import { SensorReadingData as PMScanData, PMScanDevice } from '@/types/sensor';
import { LocationData } from '@/types/PMScan';
import { useGPS } from '@/hooks/useGPS';
import { RecordingEntry, MissionContext } from '@/types/recording';
import * as logger from '@/utils/logger';

interface UnifiedDataState {
  // PMScan data - single source of truth
  currentData: PMScanData | null;
  isConnected: boolean;
  isConnecting: boolean;
  device: PMScanDevice | null;
  error: string | null;
  
  // Recording state - single source of truth
  isRecording: boolean;
  recordingData: RecordingEntry[];
  recordingFrequency: string;
  missionContext: MissionContext | null;
  recordingStartTime: Date | null;
  
  // GPS data
  latestLocation: LocationData | null;
  speedKmh: number;
  gpsQuality: 'good' | 'poor';
  locationEnabled: boolean;
  
  // Actions
  requestDevice: () => Promise<void>;
  disconnect: () => Promise<void>;
  requestLocationPermission: () => Promise<boolean>;
  startRecording: (frequency?: string) => void;
  stopRecording: () => void;
  updateMissionContext: (location: string, activity: string) => void;
  addDataPoint: (pmData: PMScanData, location?: LocationData, manualContext?: MissionContext, automaticContext?: string, enrichedLocation?: string, geohash?: string, weatherDataId?: string) => void;
  clearRecordingData: () => void;
  saveMission: (missionName: string, locationContext?: string, activityContext?: string, recordingFrequency?: string, shared?: boolean, explicitRecordingData?: RecordingEntry[], groupId?: string) => Promise<unknown>;
}

const UnifiedDataContext = createContext<UnifiedDataState | undefined>(undefined);

export function useUnifiedData(): UnifiedDataState {
  const context = useContext(UnifiedDataContext);
  if (!context) {
    throw new Error('useUnifiedData must be used within UnifiedDataProvider');
  }
  return context;
}

interface UnifiedDataProviderProps {
  children: ReactNode;
}

export function UnifiedDataProvider({ children }: UnifiedDataProviderProps) {
  const [dataFlowEnabled, setDataFlowEnabled] = useState(true);
  
  // Core data sources - using useActiveSensor for multi-sensor support
  const sensor = useActiveSensor();
  const recording = useRecordingService(); // Single source of truth
  
  // Battery optimization: Only use highAccuracy GPS when recording is active
  const useHighAccuracyGPS = recording.isRecording;
  const { latestLocation, locationEnabled, requestLocationPermission, speedKmh, gpsQuality } = useGPS(true, useHighAccuracyGPS, recording.recordingFrequency);
  
  const { saveMission: missionSaverFunction } = useMissionSaver();
  const { saveRecordingProgress, clearRecoveryData } = useCrashRecovery();

  // Stabilized action functions with useCallback
  const stableStartRecording = useCallback((frequency?: string) => {
    recording.startRecording(frequency);
  }, [recording.startRecording]);

  const stableStopRecording = useCallback(() => {
    recording.stopRecording();
  }, [recording.stopRecording]);

  const stableAddDataPoint = useCallback((
    pmData: PMScanData,
    location?: LocationData,
    manualContext?: MissionContext,
    automaticContext?: string,
    enrichedLocation?: string,
    geohash?: string,
    weatherDataId?: string
  ) => {
    recording.addDataPoint(pmData, location, manualContext, automaticContext, enrichedLocation, geohash, weatherDataId);
  }, [recording.addDataPoint]);

  const stableUpdateMissionContext = useCallback((location: string, activity: string) => {
    recording.updateMissionContext(location, activity);
  }, [recording.updateMissionContext]);

  // Unified state object - mapping useActiveSensor to UnifiedDataState
  const unifiedState: UnifiedDataState = {
    // Sensor data (multi-sensor support via useActiveSensor)
    currentData: sensor.currentData,
    isConnected: sensor.isConnected,
    isConnecting: sensor.isConnecting,
    device: sensor.deviceInfo ? {
      name: sensor.deviceInfo.name,
      battery: sensor.deviceInfo.battery,
      charging: sensor.deviceInfo.charging,
      // Legacy PMScan fields - provide defaults for compatibility
      version: 0,
      mode: 0,
      interval: 0,
      connected: sensor.isConnected
    } as PMScanDevice : null,
    error: sensor.error,
    
    // Recording state
    isRecording: recording.isRecording,
    recordingData: recording.recordingData,
    recordingFrequency: recording.recordingFrequency,
    missionContext: recording.missionContext,
    recordingStartTime: recording.recordingStartTime,
    
    // GPS data
    latestLocation,
    speedKmh,
    gpsQuality,
    locationEnabled,
    
    // Actions - using stabilized versions
    requestDevice: sensor.requestDevice,
    disconnect: sensor.disconnect,
    requestLocationPermission,
    startRecording: stableStartRecording,
    stopRecording: stableStopRecording,
    updateMissionContext: stableUpdateMissionContext,
    addDataPoint: stableAddDataPoint,
    clearRecordingData: recording.clearRecordingData,
    saveMission: async (missionName: string, locationContext?: string, activityContext?: string, recordingFrequency?: string, shared?: boolean, explicitRecordingData?: RecordingEntry[], groupId?: string) => {
      const dataToSave = explicitRecordingData || recording.recordingData;
      const mission = await missionSaverFunction(
        dataToSave,
        recording.recordingStartTime,
        missionName,
        recordingFrequency,
        shared,
        undefined, // missionId
        sensor.deviceInfo?.name, // deviceName - now from useActiveSensor
        groupId // groupId
      );
      
      // Clear recovery data after successful save
      clearRecoveryData();
      logger.debug('🧹 Cleared crash recovery data after successful mission save');
      
      return mission;
    },
  };

  // Persist recording progress for crash recovery
  useEffect(() => {
    if (recording.isRecording && recording.recordingData.length > 0) {
      saveRecordingProgress(
        recording.recordingData,
        recording.recordingStartTime,
        recording.recordingFrequency,
        recording.missionContext || { location: '', activity: '' }
      );
    }
  }, [
    recording.isRecording,
    recording.recordingData.length,
    recording.recordingStartTime,
    recording.recordingFrequency,
    recording.missionContext,
    saveRecordingProgress,
  ]);

  // Save on page unload/refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (recording.isRecording && recording.recordingData.length > 0) {
        saveRecordingProgress(
          recording.recordingData,
          recording.recordingStartTime,
          recording.recordingFrequency,
          recording.missionContext || { location: '', activity: '' }
        );
        logger.debug('💾 Saved recording progress on page unload');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [
    recording.isRecording,
    recording.recordingData,
    recording.recordingStartTime,
    recording.recordingFrequency,
    recording.missionContext,
    saveRecordingProgress,
  ]);

  return (
    <UnifiedDataContext.Provider value={unifiedState}>
      {children}
    </UnifiedDataContext.Provider>
  );
}