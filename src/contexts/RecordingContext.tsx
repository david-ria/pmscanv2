import React, { createContext, useContext, useMemo, useEffect, useState } from 'react';
import { useRecordingData } from '@/hooks/useRecordingData';
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

const RecordingContext = createContext<RecordingContextType | null>(
  null
);

export function RecordingProvider({ children }: { children: React.ReactNode }) {
  const recordingData = useRecordingData();
  const [isProviderReady, setIsProviderReady] = useState(false);

  useEffect(() => {
    logger.debug('🔄 RecordingProvider: Initializing provider');
    logger.debug('🔄 RecordingProvider: Recording data loaded', {
      isRecording: recordingData.isRecording,
      dataLength: recordingData.recordingData.length,
    });
    setIsProviderReady(true);
    logger.debug('🔄 RecordingProvider: Provider is now ready');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const contextValue = useMemo(() => {
    if (!isProviderReady) {
      logger.debug('🔄 RecordingProvider: Provider not ready yet, returning null');
      return null;
    }
    logger.debug('🔄 RecordingProvider: Creating context value', recordingData);
    return recordingData;
  }, [recordingData, isProviderReady]);

  useEffect(() => {
    if (contextValue) {
      logger.debug('🔄 RecordingProvider: Provider rendered with value', contextValue);
    }
  }, [contextValue]);

  return (
    <RecordingContext.Provider value={contextValue}>
      {children}
    </RecordingContext.Provider>
  );
}

export function useRecordingContext() {
  const context = useContext(RecordingContext);
  
  if (context === undefined) {
    logger.error('🚨 useRecordingContext called outside of RecordingProvider!');
    logger.error('🚨 Current context value:', undefined, { context });
    logger.error('🚨 Stack trace:', new Error('Stack trace'));
    throw new Error(
      'useRecordingContext must be used within a RecordingProvider'
    );
  }
  
  // Always return context, even if null - let components handle the loading state
  // This ensures consistent hook usage and prevents React Error #300
  return context || {
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
