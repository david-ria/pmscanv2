import React, { createContext, useContext, useMemo, useEffect, useState, useCallback } from 'react';
import { nativeRecordingService } from '@/services/nativeRecordingService';
import * as logger from '@/utils/logger';

interface RecordingContextType {
  isRecording: boolean;
  recordingFrequency: string;
  missionContext: {
    location: string;
    activity: string;
  };
  currentMissionId: string | null;
  startRecording: (frequency?: string) => void;
  stopRecording: () => void;
  addDataPoint: (
    pmData: any,
    location?: any,
    context?: { location: string; activity: string },
    automaticContext?: string
  ) => void;
  saveMission: (
    name: string,
    locationContext?: string,
    activityContext?: string,
    recordingFrequency?: string,
    shared?: boolean
  ) => any;
  updateMissionContext: (location: string, activity: string) => void;
  recordingStartTime: Date | null;
  recordingData: any[];
  clearRecordingData: () => void;
}

const RecordingContext = createContext<RecordingContextType | null>(null);

export function RecordingProvider({ children }: { children: React.ReactNode }) {
  // Use native recording service state with forced updates
  const [state, setState] = useState(() => nativeRecordingService.getState());
  const [updateCounter, setUpdateCounter] = useState(0);
  
  // Listen for native data events for immediate updates
  useEffect(() => {
    const handleNativeDataAdded = (event: any) => {
      console.log('🔄 React context received native data event, total:', event.detail?.totalCount);
      
      // Force update by getting fresh state from native service
      const newState = nativeRecordingService.getState();
      console.log('📊 Context updating with fresh state, recordingData length:', newState.recordingData.length);
      
      // Force a re-render by incrementing counter and setting new state
      setUpdateCounter(prev => prev + 1);
      setState({ ...newState }); // Spread to ensure new object reference
    };
    
    window.addEventListener('nativeDataAdded', handleNativeDataAdded);
    
    // Reduce polling frequency to prevent spam
    const interval = setInterval(() => {
      const newState = nativeRecordingService.getState();
      setState(prevState => {
        if (prevState.recordingData.length !== newState.recordingData.length) {
          console.log('📊 Recording data length changed:', prevState.recordingData.length, '->', newState.recordingData.length);
          setUpdateCounter(prev => prev + 1);
          return { ...newState };
        }
        return prevState;
      });
    }, 2000); // Reduced to every 2 seconds to prevent spam
    
    return () => {
      window.removeEventListener('nativeDataAdded', handleNativeDataAdded);
      clearInterval(interval);
    };
  }, []);

  const startRecording = useCallback((frequency?: string) => {
    nativeRecordingService.startRecording(frequency);
  }, []);

  const stopRecording = useCallback(() => {
    nativeRecordingService.stopRecording();
  }, []);

  const updateMissionContext = useCallback((location: string, activity: string) => {
    nativeRecordingService.updateMissionContext(location, activity);
  }, []);

  const clearRecordingData = useCallback(() => {
    nativeRecordingService.clearRecordingData();
  }, []);

  const addDataPoint = useCallback((pmData: any, location?: any, context?: any, automaticContext?: string) => {
    nativeRecordingService.addDataPoint(pmData, location);
  }, []);

  const saveMission = useCallback((name: string) => {
    const data = nativeRecordingService.getRecordingData();
    console.log('💾 Saving mission with', data.length, 'data points');
    nativeRecordingService.clearRecordingData();
    return { id: crypto.randomUUID(), name, data };
  }, []);

  const contextValue = useMemo(() => ({
    ...state,
    startRecording,
    stopRecording,
    addDataPoint,
    updateMissionContext,
    clearRecordingData,
    saveMission,
  }), [state, startRecording, stopRecording, addDataPoint, updateMissionContext, clearRecordingData, saveMission]);

  return (
    <RecordingContext.Provider value={contextValue}>
      {children}
    </RecordingContext.Provider>
  );
}

export function useRecordingContext() {
  const context = useContext(RecordingContext);
  
  if (context === undefined) {
    throw new Error('useRecordingContext must be used within a RecordingProvider');
  }
  
  if (context === null) {
    // Return a fallback context while provider is initializing
    return {
      isRecording: false,
      recordingFrequency: '10s',
      missionContext: { location: '', activity: '' },
      currentMissionId: null,
      startRecording: () => {},
      stopRecording: () => {},
      addDataPoint: () => {},
      saveMission: () => null,
      updateMissionContext: () => {},
      recordingStartTime: null,
      recordingData: [],
      clearRecordingData: () => {},
    };
  }
  
  return context;
}