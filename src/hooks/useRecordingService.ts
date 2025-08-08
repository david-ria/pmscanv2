import { useState, useEffect, useCallback } from 'react';
import { recordingService, RecordingState, RecordingActions } from '@/services/recordingService';
import { PMScanData } from '@/lib/pmscan/types';
import { LocationData } from '@/types/PMScan';
import { MissionContext } from '@/types/recording';

export function useRecordingService(): RecordingState & RecordingActions {
  const [state, setState] = useState<RecordingState>(() => recordingService.getState());

  useEffect(() => {
    const unsubscribe = recordingService.subscribe(setState);
    return unsubscribe;
  }, []);

  const startRecording = useCallback((frequency?: string) => {
    recordingService.startRecording(frequency);
  }, []);

  const stopRecording = useCallback(() => {
    recordingService.stopRecording();
  }, []);

  const addDataPoint = useCallback((
    pmData: PMScanData,
    location?: LocationData,
    context?: MissionContext,
    automaticContext?: string
  ) => {
    recordingService.addDataPoint(pmData, location, context, automaticContext);
  }, []);

  const updateMissionContext = useCallback((location: string, activity: string) => {
    recordingService.updateMissionContext(location, activity);
  }, []);

  const clearRecordingData = useCallback(() => {
    recordingService.clearRecordingData();
  }, []);

  return {
    ...state,
    startRecording,
    stopRecording,
    addDataPoint,
    updateMissionContext,
    clearRecordingData,
  };
}