import { useState, useRef, useCallback, useEffect } from 'react';
import {
  RecordingEntry,
  MissionContext,
  RecordingConfig,
} from '@/types/recording';
import { setGlobalRecording } from '@/lib/pmscan/globalConnectionManager';
import * as logger from '@/utils/logger';

const CRASH_RECOVERY_KEY = 'pmscan_recording_recovery';

export function useRecordingState() {
  const [recordingData, setRecordingData] = useState<RecordingEntry[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingFrequency, setRecordingFrequency] = useState<string>('10s');
  const [missionContext, setMissionContext] = useState<MissionContext>({
    location: '',
    activity: '',
  });

  // Restore mission context from crash recovery on mount
  useEffect(() => {
    const restoreContextFromRecovery = () => {
      try {
        const recoveryDataStr = localStorage.getItem(CRASH_RECOVERY_KEY);
        if (recoveryDataStr) {
          const recoveryData = JSON.parse(recoveryDataStr);
          if (recoveryData.missionContext) {
            logger.debug('🔄 Restoring mission context from crash recovery:', recoveryData.missionContext);
            setMissionContext(recoveryData.missionContext);
          }
        }
      } catch (error) {
        logger.error('Failed to restore mission context from crash recovery:', error);
      }
    };

    restoreContextFromRecovery();
  }, []);

  const recordingStartTime = useRef<Date | null>(null);
  const lastRecordedTime = useRef<Date | null>(null);

  const startRecording = useCallback((frequency: string = '10s') => {
    logger.debug('🎬 Starting recording with frequency:', frequency);
    setIsRecording(true);
    setRecordingData([]);
    setRecordingFrequency(frequency);
    recordingStartTime.current = new Date();
    lastRecordedTime.current = null;

    // Set global recording state to prevent disconnection during navigation
    setGlobalRecording(true);

    logger.debug('✅ Recording started! isRecording should now be:', true);
  }, []);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    // Keep recordingStartTime for mission saving - will be cleared when data is cleared

    // Clear global recording state to allow disconnection
    setGlobalRecording(false);
  }, []);

  const addDataPoint = useCallback((entry: RecordingEntry) => {
    setRecordingData((prev) => {
      const updated = [entry, ...prev];
      logger.debug('📊 Recording data updated, total points:', updated.length);
      return updated;
    });
  }, []);

  const clearRecordingData = useCallback(() => {
    setRecordingData([]);
    recordingStartTime.current = null; // Clear start time when data is cleared
    lastRecordedTime.current = null;
  }, []);

  const updateMissionContext = useCallback((location: string, activity: string) => {
    setMissionContext({ location, activity });
  }, []);

  const updateLastRecordedTime = useCallback((time: Date) => {
    lastRecordedTime.current = time;
  }, []);

  return {
    // State
    recordingData,
    isRecording,
    recordingFrequency,
    missionContext,
    recordingStartTime: recordingStartTime.current,
    lastRecordedTime: lastRecordedTime.current,

    // Actions
    startRecording,
    stopRecording,
    addDataPoint,
    clearRecordingData,
    updateMissionContext,
    updateLastRecordedTime,
  };
}
