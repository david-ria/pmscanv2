import { useState, useEffect, useCallback } from 'react';
import { recordingService, RecordingState, RecordingActions } from '@/services/recordingService';
import { PMScanData } from '@/lib/pmscan/types';
import { LocationData } from '@/types/PMScan';
import { MissionContext } from '@/types/recording';

export function useRecordingService(): RecordingState & RecordingActions & { currentMissionId?: string | null } {
  const [state, setState] = useState<RecordingState>(() => recordingService.getState());
  const [currentMissionId, setCurrentMissionId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = recordingService.subscribe(setState);
    return unsubscribe;
  }, []);

  const startRecording = useCallback((frequency?: string) => {
    // Generate a new mission ID when recording starts
    const newMissionId = crypto.randomUUID();
    setCurrentMissionId(newMissionId);
    recordingService.startRecording(frequency);
  }, []);

  const stopRecording = useCallback(() => {
    recordingService.stopRecording();
    setCurrentMissionId(null);
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
    currentMissionId,
  };
}