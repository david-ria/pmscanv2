import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { usePMScanBluetooth } from '@/hooks/usePMScanBluetooth';
import { useRecordingService } from '@/hooks/useRecordingService';
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
  addDataPoint: (pmData: PMScanData, location?: LocationData, context?: any, automaticContext?: string) => void;
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
  const recording = useRecordingService();
  const { latestLocation, locationEnabled, requestLocationPermission } = useGPS(true, false, recording.recordingFrequency);

  // Log unified state for debugging
  useEffect(() => {
    logger.debug('🔄 UNIFIED DATA STATE:', {
      hasCurrentData: !!bluetooth.currentData,
      isConnected: bluetooth.isConnected,
      isRecording: recording.isRecording,
      recordingDataLength: recording.recordingData.length,
      hasLocation: !!latestLocation,
    });
  }, [bluetooth.currentData, bluetooth.isConnected, recording.isRecording, recording.recordingData.length, latestLocation]);

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
  };

  return (
    <UnifiedDataContext.Provider value={unifiedState}>
      {children}
    </UnifiedDataContext.Provider>
  );
}