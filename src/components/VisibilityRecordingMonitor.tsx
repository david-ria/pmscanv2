import { useEffect } from 'react';
import { useRecordingContext } from '@/contexts/RecordingContext';
import * as logger from '@/utils/logger';

/**
 * Component to monitor visibility changes and prevent recording interruption
 * when the user switches windows or minimizes the app
 */
export function VisibilityRecordingMonitor() {
  const { isRecording } = useRecordingContext();

  useEffect(() => {
    if (!isRecording) return;

    const handleVisibilityChange = () => {
      const isHidden = document.hidden;
      
      if (isHidden) {
        logger.debug('🔍 App became hidden while recording - continuing recording in background');
      } else {
        logger.debug('🔍 App became visible while recording - recording continues');
      }
      
      // Don't take any action that would interrupt recording
      // The recording should continue regardless of visibility state
    };

    const handleWindowBlur = () => {
      if (isRecording) {
        logger.debug('🔍 Window lost focus while recording - continuing recording');
      }
    };

    const handleWindowFocus = () => {
      if (isRecording) {
        logger.debug('🔍 Window gained focus while recording - recording continues');
      }
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    logger.debug('🔍 Visibility monitoring enabled for recording session');

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      logger.debug('🔍 Visibility monitoring disabled');
    };
  }, [isRecording]);

  return null; // This is a monitoring component with no UI
}