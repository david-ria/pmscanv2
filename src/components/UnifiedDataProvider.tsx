import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { usePMScanBluetooth } from '@/hooks/usePMScanBluetooth';
import { useRecordingData } from '@/hooks/useRecordingData';
import { PMScanData } from '@/lib/pmscan/types';
import { LocationData } from '@/types/PMScan';
import { useGPS } from '@/hooks/useGPS';
import * as logger from '@/utils/logger';

interface UnifiedDataState {
  // PMScan data - single source of truth
  currentData: PMScanData | null;
  isConnected: boolean;
  isConnecting: boolean;
  device: any;
  error: string | null;
  
  // Recording state - single source of truth
  isRecording: boolean;
  recordingData: any[];
  recordingFrequency: string;
  missionContext: any;
  recordingStartTime: Date | null;
  
  // GPS data
  latestLocation: LocationData | null;
  locationEnabled: boolean;
  
  // Actions
  requestDevice: () => Promise<void>;
  disconnect: () => Promise<void>;
  requestLocationPermission: () => Promise<boolean>;
  startRecording: (frequency?: string) => void;
  stopRecording: () => void;
  updateMissionContext: (location: string, activity: string) => void;
  addDataPoint: (pmData: PMScanData, location?: LocationData, context?: any, automaticContext?: string, enrichedLocation?: string) => void;
  clearRecordingData: () => void;
  saveMission: (missionName: string, locationContext?: string, activityContext?: string, recordingFrequency?: string, shared?: boolean, explicitRecordingData?: any[]) => Promise<any>;
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
  const recording = useRecordingData();
  const { latestLocation, locationEnabled, requestLocationPermission } = useGPS(true, true, recording.recordingFrequency);

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
    locationEnabled,
    
    // Actions
    requestDevice: bluetooth.requestDevice,
    disconnect: bluetooth.disconnect,
    requestLocationPermission,
    startRecording: recording.startRecording,
    stopRecording: recording.stopRecording,
    updateMissionContext: recording.updateMissionContext,
    addDataPoint: recording.addDataPoint,
    clearRecordingData: recording.clearRecordingData,
  saveMission: recording.saveMission,
  };

  return (
    <UnifiedDataContext.Provider value={unifiedState}>
      {children}
    </UnifiedDataContext.Provider>
  );
}