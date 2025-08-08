import { useState, useEffect, useCallback } from 'react';
import { recordingService, RecordingState, RecordingActions } from '@/services/recordingService';
import { PMScanData } from '@/lib/pmscan/types';
import { LocationData } from '@/types/PMScan';
import { MissionContext } from '@/types/recording';
import { useBackgroundRecording } from '@/hooks/useBackgroundRecording';
import { setBackgroundRecording, getBackgroundRecording } from '@/lib/pmscan/globalConnectionManager';
import { simpleBackgroundRecording } from '@/services/simpleBackgroundRecording';
import * as logger from '@/utils/logger';

export function useRecordingService(): RecordingState & RecordingActions {
  const [state, setState] = useState<RecordingState>(() => recordingService.getState());
  
  const {
    enableBackgroundRecording,
    disableBackgroundRecording,
    storeDataForBackground,
  } = useBackgroundRecording();

  useEffect(() => {
    const unsubscribe = recordingService.subscribe(setState);
    return unsubscribe;
  }, []);

  // Set up background data handler when background recording is available
  useEffect(() => {
    recordingService.setBackgroundDataHandler(storeDataForBackground);
    return () => recordingService.setBackgroundDataHandler(null);
  }, [storeDataForBackground]);

  const startRecording = useCallback(async (frequency?: string) => {
    recordingService.startRecording(frequency);
    
    // Enable simple background recording if background mode is active
    if (getBackgroundRecording()) {
      await simpleBackgroundRecording.enable();
      logger.debug('🌙 Simple background recording enabled for session');
    }
  }, []);

  const stopRecording = useCallback(async () => {
    recordingService.stopRecording();
    
    // Always disable background recording when stopping
    await simpleBackgroundRecording.disable();
    logger.debug('🌙 Simple background recording disabled after stop');
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

  const saveMission = useCallback((
    name: string,
    locationContext?: string,
    activityContext?: string,
    recordingFrequency?: string,
    shared?: boolean
  ) => {
    return recordingService.saveMission(name, locationContext, activityContext, recordingFrequency, shared);
  }, []);

  return {
    ...state,
    startRecording,
    stopRecording,
    addDataPoint,
    updateMissionContext,
    clearRecordingData,
    saveMission,
  };
}