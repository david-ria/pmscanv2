import { useEffect } from 'react';
import { useRecordingContext } from '@/contexts/RecordingContext';
import * as logger from '@/utils/logger';

/**
 * Hook to ensure recording persists across browser lifecycle events
 * This prevents recording from being interrupted by browser power management
 */
export function useBackgroundRecordingPersistence() {
  const { isRecording } = useRecordingContext();

  useEffect(() => {
    if (!isRecording) return;

    // Prevent page from being put to sleep during recording
    let wakeLock: WakeLockSentinel | null = null;

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
          logger.debug('🔋 Wake lock acquired for recording session');
        }
      } catch (error) {
        logger.debug('🔋 Wake lock not available:', error);
      }
    };

    // Request wake lock when recording starts
    requestWakeLock();

    // Re-request wake lock if it gets released
    const handleVisibilityChange = () => {
      if (wakeLock !== null && document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (wakeLock) {
        wakeLock.release();
        logger.debug('🔋 Wake lock released');
      }
    };
  }, [isRecording]);
}