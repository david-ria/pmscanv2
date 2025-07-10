import React, { createContext, useContext } from 'react';
import { useRecordingData } from '@/hooks/useRecordingData';

interface RecordingContextType {
  isRecording: boolean;
  recordingFrequency: string;
  missionContext: {
    location: string;
    activity: string;
  };
  startRecording: (frequency?: string) => void;
  stopRecording: () => void;
  addDataPoint: (pmData: any, location?: any, context?: { location: string; activity: string }) => void;
  saveMission: (name: string, locationContext?: string, activityContext?: string, recordingFrequency?: string, shared?: boolean) => any;
  updateMissionContext: (location: string, activity: string) => void;
  recordingStartTime: Date | null;
  recordingData: any[];
  clearRecordingData: () => void;
}

const RecordingContext = createContext<RecordingContextType | undefined>(undefined);

export function RecordingProvider({ children }: { children: React.ReactNode }) {
  const recordingData = useRecordingData();
  
  return (
    <RecordingContext.Provider value={recordingData}>
      {children}
    </RecordingContext.Provider>
  );
}

export function useRecordingContext() {
  const context = useContext(RecordingContext);
  if (context === undefined) {
    throw new Error('useRecordingContext must be used within a RecordingProvider');
  }
  return context;
}