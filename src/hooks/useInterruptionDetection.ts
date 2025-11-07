/**
 * React Hook: Interruption Detection
 * 
 * Monitors app interruptions and triggers emergency data saves
 */

import { useEffect } from 'react';
import { interruptionHandler, InterruptionEvent } from '@/lib/interruptionHandler';
import { recordingService } from '@/services/recordingService';
import * as logger from '@/utils/logger';

interface UseInterruptionDetectionOptions {
  enabled?: boolean;
  onInterruption?: (event: InterruptionEvent) => void;
}

export function useInterruptionDetection(options: UseInterruptionDetectionOptions = {}) {
  const { enabled = true, onInterruption } = options;

  useEffect(() => {
    if (!enabled) return;

    // Register interruption handler
    const unsubscribe = interruptionHandler.onInterruption(async (event) => {
      logger.info('🚨 Interruption detected in hook:', event.type);

      // Get current recording state
      const state = recordingService.getState();
      
      if (state.isRecording && state.recordingData.length > 0) {
        logger.warn('💾 Emergency save triggered:', {
          dataPoints: state.recordingData.length,
          interruption: event.type
        });

        // Send emergency save to Service Worker
        if ('serviceWorker' in navigator) {
          try {
            const registration = await navigator.serviceWorker.ready;
            
            if (registration.active) {
              registration.active.postMessage({
                type: 'EMERGENCY_SAVE',
                payload: {
                  recordingData: state.recordingData,
                  missionContext: state.missionContext,
                  interruptionType: event.type,
                  timestamp: event.timestamp
                }
              });
              
              logger.info('✅ Emergency data sent to Service Worker');
            }
          } catch (error) {
            logger.error('❌ Failed to send emergency save:', error);
          }
        }
      }

      // Call user callback if provided
      if (onInterruption) {
        onInterruption(event);
      }
    });

    // Sync recording state with interruption handler
    const syncState = () => {
      const state = recordingService.getState();
      interruptionHandler.setRecordingState(state.isRecording);
    };

    // Initial sync
    syncState();

    // Subscribe to recording state changes
    const unsubscribeRecording = recordingService.subscribe(syncState);

    logger.info('👂 Interruption detection hook mounted');

    // Cleanup
    return () => {
      unsubscribe();
      unsubscribeRecording();
    };
  }, [enabled, onInterruption]);

  return {
    triggerEmergencySave: () => interruptionHandler.triggerEmergencySave(),
    getLastInterruption: () => interruptionHandler.getLastInterruption()
  };
}
