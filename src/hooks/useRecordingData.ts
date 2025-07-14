import { useEffect } from 'react';
import { PMScanData } from '@/lib/pmscan/types';
import { LocationData } from '@/types/PMScan';
import { useRecordingState } from './useRecordingState';
import { useBackgroundRecordingIntegration } from './useBackgroundRecordingIntegration';
import { useMissionSaver } from './useMissionSaver';
import { useAutoSync } from './useAutoSync';
import { useDataPointRecorder } from './useDataPointRecorder';
import { useCrashRecovery } from './useCrashRecovery';
import {
  setGlobalRecording,
  setBackgroundRecording,
  getBackgroundRecording,
} from '@/lib/pmscan/globalConnectionManager';
import * as logger from '@/utils/logger';

export function useRecordingData() {
  const {
    recordingData,
    isRecording,
    recordingFrequency,
    missionContext,
    recordingStartTime,
    startRecording: startRecordingState,
    stopRecording: stopRecordingState,
    addDataPoint: addDataPointToState,
    clearRecordingData,
    updateMissionContext,
    updateLastRecordedTime,
  } = useRecordingState();

  const {
    enableRecordingBackground,
    disableRecordingBackground,
    storeBackgroundData,
  } = useBackgroundRecordingIntegration();

  const { saveMission: saveMissionHelper } = useMissionSaver();
  const { saveRecordingProgress, clearRecoveryData } = useCrashRecovery();

  const { addDataPoint } = useDataPointRecorder({
    isRecording,
    recordingFrequency,
    storeBackgroundData,
    addDataPointToState,
    updateLastRecordedTime,
  });

  // Use auto-sync functionality
  useAutoSync();

  // Monitor recording state changes and save progress for crash recovery
  useEffect(() => {
    if (isRecording) {
      logger.debug('🎬 Recording started');
      
      // Periodically save recording progress for crash recovery
      const interval = setInterval(() => {
        saveRecordingProgress(
          recordingData,
          recordingStartTime,
          recordingFrequency,
          missionContext
        );
      }, 5000); // Save every 5 seconds

      return () => clearInterval(interval);
    }
  }, [isRecording, recordingData, recordingStartTime, recordingFrequency, missionContext, saveRecordingProgress]);

  // Save progress whenever new data is added
  useEffect(() => {
    if (isRecording && recordingData.length > 0) {
      saveRecordingProgress(
        recordingData,
        recordingStartTime,
        recordingFrequency,
        missionContext
      );
    }
  }, [recordingData, isRecording, recordingStartTime, recordingFrequency, missionContext, saveRecordingProgress]);

  const startRecording = async (frequency: string = '10s') => {
    startRecordingState(frequency);
    setGlobalRecording(true);

    // Enable background recording if background mode is active
    if (getBackgroundRecording()) {
      await enableRecordingBackground(frequency);
    }
  };

  const stopRecording = async () => {
    stopRecordingState();
    setGlobalRecording(false);

    // Disable background recording when stopping
    await disableRecordingBackground();
  };

  const saveMission = (
    missionName: string,
    locationContext?: string,
    activityContext?: string,
    recordingFrequency?: string,
    shared?: boolean
  ) => {
    const mission = saveMissionHelper(
      recordingData,
      recordingStartTime,
      missionName,
      locationContext,
      activityContext,
      recordingFrequency,
      shared
    );

    // Clear crash recovery data since mission was properly saved
    clearRecoveryData();
    
    // Clear recording data
    clearRecordingData();

    return mission;
  };

  return {
    recordingData,
    isRecording,
    recordingFrequency,
    missionContext,
    startRecording,
    stopRecording,
    addDataPoint,
    saveMission,
    clearRecordingData,
    updateMissionContext,
    recordingStartTime,
  };
}
