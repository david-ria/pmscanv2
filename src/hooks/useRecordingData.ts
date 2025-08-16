import { useEffect, useCallback, useMemo, useState } from 'react';
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
  // Track current mission ID when recording starts
  const [currentMissionId, setCurrentMissionId] = useState<string | null>(null);
  // All hooks must be called in the same order every time
  const recordingState = useRecordingState();

  const backgroundRecordingIntegration = useBackgroundRecordingIntegration();

  const missionSaver = useMissionSaver();

  const crashRecovery = useCrashRecovery();

  useEffect(() => {
    logger.debug('🔄 useRecordingData: Hook called');
    logger.debug('🔄 useRecordingData: recordingState loaded', {
      isRecording: recordingState.isRecording,
    });
    logger.debug('🔄 useRecordingData: backgroundRecordingIntegration loaded');
    logger.debug('🔄 useRecordingData: missionSaver loaded');
    logger.debug('🔄 useRecordingData: crashRecovery loaded');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Use auto-sync functionality - must be called before conditional logic
  useAutoSync();

  // Destructure after all hooks are called
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
  } = recordingState;

  const {
    enableRecordingBackground,
    disableRecordingBackground,
    storeBackgroundData,
  } = backgroundRecordingIntegration;

  const { saveMission: saveMissionHelper } = missionSaver;
  const { saveRecordingProgress, clearRecoveryData } = crashRecovery;

  const dataPointRecorder = useDataPointRecorder({
    isRecording,
    recordingFrequency,
    storeBackgroundData,
    addDataPointToState,
    updateLastRecordedTime,
  });

  const { addDataPoint } = dataPointRecorder;

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
  }, [
    isRecording,
    recordingData,
    recordingStartTime,
    recordingFrequency,
    missionContext,
    saveRecordingProgress,
  ]);

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
  }, [
    recordingData,
    isRecording,
    recordingStartTime,
    recordingFrequency,
    missionContext,
    saveRecordingProgress,
  ]);

  const startRecording = useCallback(
    async (frequency: string = '10s') => {
      // Generate a new mission ID when recording starts
      const newMissionId = crypto.randomUUID();
      setCurrentMissionId(newMissionId);
      
      startRecordingState(frequency);
      setGlobalRecording(true);

      // Enable background recording if background mode is active
      if (getBackgroundRecording()) {
        await enableRecordingBackground(frequency);
      }
    },
    [startRecordingState, enableRecordingBackground]
  );

  const stopRecording = useCallback(async () => {
    stopRecordingState();
    setGlobalRecording(false);
    setCurrentMissionId(null);

    // Disable background recording when stopping
    await disableRecordingBackground();
  }, [stopRecordingState, disableRecordingBackground]);

  const saveMission = useCallback(
    async (
      missionName: string,
      locationContext?: string,
      activityContext?: string,
      recordingFrequency?: string,
      shared?: boolean,
      explicitRecordingData?: any[]
    ) => {
      console.log('🔄 useRecordingData.saveMission called with:', {
        missionName,
        explicitDataLength: explicitRecordingData?.length,
        stateDataLength: recordingData.length,
        hasRecordingStartTime: !!recordingStartTime
      });

      // First try to get data from crash recovery if state data is empty
      let dataToSave = explicitRecordingData || recordingData;
      let startTimeToUse = recordingStartTime;

      if (dataToSave.length === 0) {
        console.log('🔄 State data empty, checking crash recovery...');
        
        try {
          const crashRecoveryStr = localStorage.getItem('pmscan_recording_recovery');
          if (crashRecoveryStr) {
            const crashData = JSON.parse(crashRecoveryStr);
            console.log('🔄 Found crash recovery data:', {
              recordingDataLength: crashData.recordingData?.length || 0,
              startTime: crashData.startTime,
              frequency: crashData.frequency
            });
            
            if (crashData.recordingData && crashData.recordingData.length > 0) {
              // Convert timestamps back to Date objects
              dataToSave = crashData.recordingData.map((entry: any) => ({
                ...entry,
                pmData: {
                  ...entry.pmData,
                  timestamp: new Date(entry.pmData.timestamp),
                },
                timestamp: new Date(entry.timestamp)
              }));
              startTimeToUse = new Date(crashData.startTime);
              console.log('🔄 Using crash recovery data:', {
                dataLength: dataToSave.length,
                startTime: startTimeToUse
              });
            }
          }
        } catch (error) {
          console.error('❌ Error reading crash recovery data:', error);
        }
      }
      
      // Capture data locally before any clearing operations
      const capturedData = [...dataToSave];
      const capturedStartTime = startTimeToUse;
      
      console.log('🔄 Data captured for saving:', {
        capturedDataLength: capturedData.length,
        capturedStartTime,
        sampleEntry: capturedData[0]
      });

      if (!capturedStartTime || capturedData.length === 0) {
        console.error('❌ Cannot save mission: missing data or start time');
        throw new Error('No recording data available to save');
      }

      // Save mission with captured data
      const mission = await saveMissionHelper(
        capturedData,
        capturedStartTime,
        missionName,
        locationContext,
        activityContext,
        recordingFrequency,
        shared,
        currentMissionId || undefined
      );

      console.log('✅ Mission saved successfully, now clearing state and crash recovery');

      // Clear crash recovery data since mission was properly saved
      clearRecoveryData();

      // Clear recording data only after successful save
      clearRecordingData();

      return mission;
    },
    [
      recordingData,
      recordingStartTime,
      saveMissionHelper,
      clearRecoveryData,
      clearRecordingData,
      currentMissionId,
    ]
  );

  return useMemo(
    () => ({
      recordingData,
      isRecording,
      recordingFrequency,
      missionContext,
      currentMissionId,
      startRecording,
      stopRecording,
      addDataPoint,
      saveMission,
      clearRecordingData,
      updateMissionContext,
      recordingStartTime,
    }),
    [
      recordingData,
      isRecording,
      recordingFrequency,
      missionContext,
      currentMissionId,
      startRecording,
      stopRecording,
      addDataPoint,
      saveMission,
      clearRecordingData,
      updateMissionContext,
      recordingStartTime,
    ]
  );
}
