import { useState, useEffect, useCallback } from 'react';
import { recordingService, RecordingState, RecordingActions } from '@/services/recordingService';
import { PMScanData } from '@/lib/pmscan/types';
import { LocationData } from '@/types/PMScan';
import { MissionContext } from '@/types/recording';
import * as logger from '@/utils/logger';

export function useRecordingService(): RecordingState & RecordingActions {
  const [state, setState] = useState<RecordingState>(() => {
    const initialState = recordingService.getState();
    logger.debug('🎯 useRecordingService initial state:', initialState);
    return initialState;
  });

  useEffect(() => {
    logger.debug('🎯 useRecordingService subscribing to recording service');
    const unsubscribe = recordingService.subscribe((newState) => {
      logger.debug('🎯 useRecordingService received state update:', newState);
      setState(newState);
    });
    return unsubscribe;
  }, []);

  const startRecording = useCallback((frequency?: string) => {
    logger.debug('🚨 useRecordingService.startRecording called with frequency:', frequency);
    recordingService.startRecording(frequency);
  }, []);

  const stopRecording = useCallback(() => {
    recordingService.stopRecording();
  }, []);

  const addDataPoint = useCallback((
    pmData: PMScanData,
    location?: LocationData,
    context?: MissionContext,
    automaticContext?: string,
    enrichedLocation?: string // NEW parameter
  ) => {
    recordingService.addDataPoint(pmData, location, context, automaticContext, enrichedLocation);
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
    // No saveMission - will be handled at UnifiedDataProvider level using existing useMissionSaver
  };
}