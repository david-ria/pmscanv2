/**
 * Interruption Detector Component
 * 
 * Monitors app interruptions and triggers emergency saves
 * Must be mounted at app root level to work during recording
 */

import { useInterruptionDetection } from '@/hooks/useInterruptionDetection';
import * as logger from '@/utils/logger';

export function InterruptionDetector() {
  // Enable interruption detection
  useInterruptionDetection({
    enabled: true,
    onInterruption: (event) => {
      logger.info('⚠️ App interruption:', {
        type: event.type,
        wasRecording: event.wasRecording,
        time: new Date(event.timestamp).toISOString()
      });
    }
  });

  // This component doesn't render anything
  return null;
}
