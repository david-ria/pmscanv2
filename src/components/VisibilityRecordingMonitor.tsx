import { useEffect, useRef } from 'react';
import { useRecordingContext } from '@/contexts/RecordingContext';
import { globalConnectionManager } from '@/lib/pmscan/globalConnectionManager';
import * as logger from '@/utils/logger';

/**
 * Component to monitor visibility changes and prevent recording interruption
 * when the user switches windows or minimizes the app
 */
export function VisibilityRecordingMonitor() {
  const { isRecording } = useRecordingContext();
  const keepAliveIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isRecording) {
      // Clear any existing keep-alive interval when not recording
      if (keepAliveIntervalRef.current) {
        clearInterval(keepAliveIntervalRef.current);
        keepAliveIntervalRef.current = null;
      }
      return;
    }

    const handleVisibilityChange = () => {
      const isHidden = document.hidden;
      
      if (isHidden) {
        logger.debug('🔍 App became hidden while recording - starting aggressive keep-alive');
        
        // Start more frequent keep-alive checks when in background
        if (keepAliveIntervalRef.current) {
          clearInterval(keepAliveIntervalRef.current);
        }
        
        keepAliveIntervalRef.current = setInterval(async () => {
          try {
            const isConnected = await globalConnectionManager.keepAlive();
            if (!isConnected) {
              logger.debug('🔍 Background keep-alive detected connection loss');
            }
          } catch (error) {
            logger.debug('🔍 Background keep-alive failed:', error);
          }
        }, 2000); // Every 2 seconds in background
        
      } else {
        logger.debug('🔍 App became visible while recording - reducing keep-alive frequency');
        
        // Reduce frequency when visible
        if (keepAliveIntervalRef.current) {
          clearInterval(keepAliveIntervalRef.current);
          keepAliveIntervalRef.current = null;
        }
      }
    };

    const handleWindowBlur = () => {
      if (isRecording) {
        logger.debug('🔍 Window lost focus while recording - maintaining connection');
      }
    };

    const handleWindowFocus = () => {
      if (isRecording) {
        logger.debug('🔍 Window gained focus while recording - connection maintained');
        
        // Clear background keep-alive when focused
        if (keepAliveIntervalRef.current) {
          clearInterval(keepAliveIntervalRef.current);
          keepAliveIntervalRef.current = null;
        }
      }
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    logger.debug('🔍 Enhanced visibility monitoring enabled for recording session');

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      
      // Clear keep-alive interval
      if (keepAliveIntervalRef.current) {
        clearInterval(keepAliveIntervalRef.current);
        keepAliveIntervalRef.current = null;
      }
      
      logger.debug('🔍 Enhanced visibility monitoring disabled');
    };
  }, [isRecording]);

  return null; // This is a monitoring component with no UI
}