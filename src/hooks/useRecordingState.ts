import { useState, useRef, useCallback, useEffect } from 'react';
import {
  RecordingEntry,
  MissionContext,
  RecordingConfig,
} from '@/types/recording';
import { setGlobalRecording } from '@/lib/pmscan/globalConnectionManager';
import * as logger from '@/utils/logger';
import { createTimestamp } from '@/utils/timeFormat';

const CRASH_RECOVERY_KEY = 'pmscan_recording_recovery';

export function useRecordingState() {
  const [recordingData, setRecordingData] = useState<RecordingEntry[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingFrequency, setRecordingFrequency] = useState<string>('10s');
  const [missionContext, setMissionContext] = useState<MissionContext>({
    location: '',
    activity: '',
  });

  // Debug state changes
  useEffect(() => {
    logger.debug('🎬 useRecordingState: isRecording changed to:', isRecording);
  }, [isRecording]);

  useEffect(() => {
    logger.debug('🎬 useRecordingState: recordingFrequency changed to:', recordingFrequency);
  }, [recordingFrequency]);

  useEffect(() => {
    logger.debug('🎬 useRecordingState: missionContext changed to:', missionContext);
  }, [missionContext]);


  const recordingStartTime = useRef<Date | null>(null);
  const lastRecordedTime = useRef<Date | null>(null);

  const startRecording = useCallback((frequency: string = '10s') => {
    logger.debug('🎬 Starting recording with frequency:', frequency);
    logger.debug('🎬 Current isRecording before setting:', isRecording);
    setIsRecording(true);
    setRecordingData([]);
    setRecordingFrequency(frequency);
    recordingStartTime.current = createTimestamp();
    lastRecordedTime.current = null;

    // Set global recording state to prevent disconnection during navigation
    setGlobalRecording(true);

    logger.debug('✅ Recording started! isRecording should now be:', true);
    logger.debug('🎬 setIsRecording(true) called, state will update in next render');
  }, [isRecording]);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    // Keep recordingStartTime and data for mission saving - will be cleared only after successful save

    // Clear global recording state to allow disconnection
    setGlobalRecording(false);
  }, []);

  const addDataPoint = useCallback((entry: RecordingEntry) => {
    console.log('🔄 useRecordingState.addDataPoint called with:', {
      pm25: entry.pmData.pm25,
      timestamp: entry.timestamp,
      currentRecordingDataLength: recordingData.length,
      isCurrentlyRecording: isRecording
    });
    
    setRecordingData((prev) => {
      const updated = [entry, ...prev];
      console.log('📊 Recording data updated, total points:', updated.length, 'previous:', prev.length);
      logger.debug('📊 Recording data updated, total points:', updated.length);
      return updated;
    });
  }, [recordingData.length, isRecording]);

  const clearRecordingData = useCallback(() => {
    console.log('🗑️ useRecordingState.clearRecordingData called, current length:', recordingData.length);
    setRecordingData([]);
    recordingStartTime.current = null; // Clear start time when data is cleared
    lastRecordedTime.current = null;
  }, [recordingData.length]);

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
