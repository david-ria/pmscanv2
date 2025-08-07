import { useEffect, useRef } from 'react';
import { recordingPersistenceService } from '@/services/recordingPersistenceService';
import { useRecordingService } from './useRecordingService';
import * as logger from '@/utils/logger';

/**
 * Hook to handle recording persistence across browser sessions and navigation
 */
export function useRecordingPersistence() {
  const recordingService = useRecordingService();
  const hasInitialized = useRef(false);
  const restorationAttempted = useRef(false);

  // Initialize persistence and check for interrupted recordings
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const initializePersistence = async () => {
      try {
        const { shouldRestore, persistedState } = await recordingPersistenceService.initialize();

        if (shouldRestore && persistedState && !restorationAttempted.current) {
          restorationAttempted.current = true;
          logger.debug('🔄 Attempting to restore interrupted recording');

          // Wait a bit for the recording service to be fully ready
          setTimeout(async () => {
            try {
              await recordingPersistenceService.restoreRecording(persistedState, {
                startRecording: recordingService.startRecording,
                updateMissionContext: recordingService.updateMissionContext,
              });
              
              logger.debug('✅ Recording restoration successful');
            } catch (error) {
              logger.debug('⚠️ Failed to restore recording:', error);
            }
          }, 1000);
        }
      } catch (error) {
        logger.debug('⚠️ Error during persistence initialization:', error);
      }
    };

    initializePersistence();
  }, []); // Only run once

  // Track recording state changes for persistence
  useEffect(() => {
    if (!hasInitialized.current) return;

    const recordingState = {
      ...recordingService,
      currentMissionId: recordingService.currentMissionId,
    };

    if (recordingService.isRecording) {
      // Start or update persistence
      recordingPersistenceService.startPersistence(recordingState);
    } else {
      // Stop persistence when recording stops
      recordingPersistenceService.stopPersistence();
    }

    // Update persisted state on any change
    recordingPersistenceService.updateState(recordingState);
  }, [
    recordingService.isRecording,
    recordingService.recordingFrequency,
    recordingService.missionContext,
    recordingService.recordingStartTime,
    recordingService.currentMissionId,
  ]);

  return {
    hasActivePersistedRecording: recordingPersistenceService.hasActivePersistedRecording(),
  };
}