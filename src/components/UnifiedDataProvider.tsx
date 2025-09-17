import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { usePMScanBluetooth } from '@/hooks/usePMScanBluetooth';
import { useRecordingService } from '@/hooks/useRecordingService';
import { useMissionSaver } from '@/hooks/useMissionSaver';
import { PMScanData, PMScanDevice } from '@/lib/pmscan/types';
import { LocationData } from '@/types/PMScan';
import { useGPS } from '@/hooks/useGPS';
import { RecordingEntry } from '@/types/recording';
import * as logger from '@/utils/logger';

interface MissionContext {
  location: string;
  activity: string;
}

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
  
  // Device picker state
  showDevicePicker: boolean;
  availableDevices: any[];
  onDevicePickerSelect: (device: any) => void;
  onDevicePickerCancel: () => void;
  onForgetDevice: () => void;
  
  // Actions
  requestDevice: () => Promise<void>;
  disconnect: () => Promise<void>;
  requestLocationPermission: () => Promise<boolean>;
  startRecording: (frequency?: string) => void;
  stopRecording: () => void;
  updateMissionContext: (location: string, activity: string) => void;
  addDataPoint: (pmData: PMScanData, location?: LocationData, context?: MissionContext, automaticContext?: string, enrichedLocation?: string, geohash?: string) => void;
  clearRecordingData: () => void;
  saveMission: (missionName: string, locationContext?: string, activityContext?: string, recordingFrequency?: string, shared?: boolean, explicitRecordingData?: RecordingEntry[]) => Promise<unknown>;
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
  
  // Core data sources
  const bluetooth = usePMScanBluetooth();
  const recording = useRecordingService(); // Single source of truth
  const { latestLocation, locationEnabled, requestLocationPermission, speedKmh, gpsQuality } = useGPS(true, true, recording.recordingFrequency);
  const { saveMission: missionSaverFunction } = useMissionSaver();

  // Enhanced state change tracking
  useEffect(() => {
    console.log('🔄 UNIFIED DATA - RECORDING STATE CHANGED:', {
      isRecording: recording.isRecording,
      hasAddDataPoint: !!recording.addDataPoint,
      timestamp: new Date().toISOString()
    });
  }, [recording.isRecording, recording.addDataPoint]);

  useEffect(() => {
    console.log('🔄 UNIFIED DATA - BLUETOOTH STATE CHANGED:', {
      hasCurrentData: !!bluetooth.currentData,
      isConnected: bluetooth.isConnected,
      pm25: bluetooth.currentData?.pm25,
      timestamp: new Date().toISOString()
    });
  }, [bluetooth.currentData, bluetooth.isConnected]);

  // Enhanced unified state logging
  useEffect(() => {
    console.log('🔄 UNIFIED DATA COMPLETE STATE:', {
      hasCurrentData: !!bluetooth.currentData,
      currentDataPM25: bluetooth.currentData?.pm25,
      isConnected: bluetooth.isConnected,
      isRecording: recording.isRecording,
      recordingDataLength: recording.recordingData.length,
      hasLocation: !!latestLocation,
      hasAddDataPoint: !!recording.addDataPoint,
      timestamp: new Date().toISOString(),
      // Test the exact conditions GlobalDataCollector checks
      willProceedCheck: recording.isRecording && !!bluetooth.currentData && !!recording.addDataPoint
    });
  }, [bluetooth.currentData, bluetooth.isConnected, recording.isRecording, recording.recordingData.length, latestLocation, recording.addDataPoint]);

  // Unified state object
  console.log('🔄 UNIFIED DATA - GPS STATE:', {
    hasLocation: !!latestLocation,
    latitude: latestLocation?.latitude,
    longitude: latestLocation?.longitude,
    accuracy: latestLocation?.accuracy,
    speedKmh,
    gpsQuality,
    locationEnabled
  });

  const unifiedState: UnifiedDataState = {
    // PMScan data
    currentData: bluetooth.currentData,
    isConnected: bluetooth.isConnected,
    isConnecting: bluetooth.isConnecting,
    device: bluetooth.device,
    error: bluetooth.error,
    
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
    
    // Device picker state
    showDevicePicker: bluetooth.showDevicePicker,
    availableDevices: bluetooth.availableDevices,
    onDevicePickerSelect: bluetooth.onDevicePickerSelect,
    onDevicePickerCancel: bluetooth.onDevicePickerCancel,
    onForgetDevice: bluetooth.onForgetDevice,
    
    // Actions
    requestDevice: bluetooth.requestDevice,
    disconnect: bluetooth.disconnect,
    requestLocationPermission,
    startRecording: recording.startRecording,
    stopRecording: recording.stopRecording,
    updateMissionContext: recording.updateMissionContext,
    addDataPoint: recording.addDataPoint,
    clearRecordingData: recording.clearRecordingData,
    saveMission: async (missionName: string, locationContext?: string, activityContext?: string, recordingFrequency?: string, shared?: boolean, explicitRecordingData?: RecordingEntry[]) => {
      const dataToSave = explicitRecordingData || recording.recordingData;
      return missionSaverFunction(
        dataToSave,
        recording.recordingStartTime,
        missionName,
        locationContext,
        activityContext,
        recordingFrequency,
        shared,
        undefined, // missionId
        bluetooth.device?.name // deviceName
      );
    },
  };

  return (
    <UnifiedDataContext.Provider value={unifiedState}>
      {children}
    </UnifiedDataContext.Provider>
  );
}