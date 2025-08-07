import { useEffect, useRef } from 'react';
import { useRecordingContext } from '@/contexts/RecordingContext';
import { setGlobalRecording, setBackgroundRecording } from '@/lib/pmscan/globalConnectionManager';
import { connectionStabilityService } from '@/services/connectionStabilityService';
import * as logger from '@/utils/logger';

/**
 * Global component to monitor and protect recording state
 * This prevents accidental stopping of recordings due to component unmounting
 */
export function RecordingStateMonitor() {
  const { isRecording, recordingFrequency } = useRecordingContext();
  const previousRecordingState = useRef<boolean>(false);
  const recordingProtectionTimer = useRef<NodeJS.Timeout | null>(null);

  // Monitor recording state changes and ensure global state stays synchronized
  useEffect(() => {
    const hasRecordingStateChanged = previousRecordingState.current !== isRecording;
    
    if (hasRecordingStateChanged) {
      logger.debug('🔒 Recording state monitor detected change:', {
        previous: previousRecordingState.current,
        current: isRecording,
        timestamp: new Date().toISOString()
      });

      // Update global states
      setGlobalRecording(isRecording);
      setBackgroundRecording(isRecording);

      if (isRecording) {
        // Start protection when recording begins
        startRecordingProtection();
        // Start enhanced connection stability monitoring
        connectionStabilityService.startStabilityMonitoring();
      } else {
        // Stop protection when recording ends
        stopRecordingProtection();
        // Stop connection stability monitoring
        connectionStabilityService.stopStabilityMonitoring();
      }

      previousRecordingState.current = isRecording;
    }
  }, [isRecording]);

  // Enhanced protection against accidental recording stops
  const startRecordingProtection = () => {
    logger.debug('🛡️ Starting enhanced recording protection');
    
    // Clear any existing timer
    if (recordingProtectionTimer.current) {
      clearInterval(recordingProtectionTimer.current);
    }

    // Set up periodic verification
    recordingProtectionTimer.current = setInterval(() => {
      if (previousRecordingState.current) {
        // Verify that global states are still set correctly
        setGlobalRecording(true);
        setBackgroundRecording(true);
        
        logger.debug('🛡️ Recording protection: Verified global states', {
          timestamp: new Date().toISOString()
        });
      }
    }, 10000); // Check every 10 seconds
  };

  const stopRecordingProtection = () => {
    logger.debug('🛡️ Stopping recording protection');
    
    if (recordingProtectionTimer.current) {
      clearInterval(recordingProtectionTimer.current);
      recordingProtectionTimer.current = null;
    }
  };

  // Browser lifecycle event handlers
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isRecording) {
        // Warn user if they try to close during recording
        const message = 'Recording in progress. Are you sure you want to leave?';
        event.preventDefault();
        event.returnValue = message;
        return message;
      }
    };

    const handleVisibilityChange = () => {
      if (isRecording) {
        const isHidden = document.hidden;
        logger.debug(`🔒 Page visibility changed while recording: ${isHidden ? 'hidden' : 'visible'}`);
        
        // Ensure recording states remain active
        setGlobalRecording(true);
        setBackgroundRecording(true);
      }
    };

    const handlePageHide = () => {
      if (isRecording) {
        logger.debug('🔒 Page hide event during recording - maintaining state');
        setGlobalRecording(true);
        setBackgroundRecording(true);
      }
    };

    const handlePageShow = () => {
      if (isRecording) {
        logger.debug('🔒 Page show event during recording - verifying state');
        setGlobalRecording(true);
        setBackgroundRecording(true);
      }
    };

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', handlePageShow);

    // Cleanup
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('pageshow', handlePageShow);
      
      stopRecordingProtection();
    };
  }, [isRecording]);

  // Component cleanup
  useEffect(() => {
    return () => {
      stopRecordingProtection();
    };
  }, []);

  return null; // This is a monitoring component with no UI
}