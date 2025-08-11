import { useState, useEffect, useRef } from 'react';
import { nativeRecordingService } from '@/services/nativeRecordingService';
import { parseFrequencyToMs } from '@/lib/recordingUtils';
import { createDataHash } from '@/utils/timestampUtils';
import { logPollingUpdate, throttledLog } from '@/utils/debugLogger';

/**
 * Hook that directly polls the native recording service for real-time data updates
 * Bypasses React context to ensure immediate updates
 * Uses the actual recording frequency for polling rate
 */
export function useDirectRecordingData(isRecording: boolean, recordingFrequency: string = '10s') {
  const [recordingData, setRecordingData] = useState<any[]>([]);
  const [dataCount, setDataCount] = useState(0);
  const [lastDataHash, setLastDataHash] = useState<string>('');
  const intervalRef = useRef<number | null>(null);
  const isVisibleRef = useRef<boolean>(true);
  
  // Convert recording frequency to milliseconds for polling
  const pollInterval = parseFrequencyToMs(recordingFrequency);
  
  // Handle window visibility changes to ensure polling continues
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      isVisibleRef.current = isVisible;
      
      if (isVisible && isRecording) {
        // When window becomes visible again, force immediate poll
        throttledLog('visibility-restored', '👁️ Window visible - resuming data polling');
        
        // Small delay to ensure everything is ready
        setTimeout(() => {
          try {
            const currentData = nativeRecordingService.getRecordingData();
            const currentCount = currentData.length;
            
            const latestEntry = currentCount > 0 ? currentData[currentCount - 1] : null;
            const dataHash = createDataHash(
              currentCount,
              latestEntry?.pmData?.timestamp,
              latestEntry?.pmData?.pm25
            );
            
            if (dataHash !== lastDataHash) {
              setRecordingData(currentData.map(entry => ({ ...entry })));
              setDataCount(currentCount);
              setLastDataHash(dataHash);
              throttledLog('visibility-data-sync', `📊 Synced ${currentCount} data points after visibility restore`);
            }
          } catch (error) {
            console.error('Error syncing data after visibility restore:', error);
          }
        }, 100);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isRecording, lastDataHash]);
  
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Smart polling function that only updates when data actually changes
    const pollData = () => {
      try {
        const currentData = nativeRecordingService.getRecordingData();
        const currentCount = currentData.length;
        
        // Create a hash of the latest data to detect real changes
        const latestEntry = currentCount > 0 ? currentData[currentCount - 1] : null;
        const dataHash = createDataHash(
          currentCount,
          latestEntry?.pmData?.timestamp,
          latestEntry?.pmData?.pm25
        );
        
        // Only update if data actually changed
        if (dataHash !== lastDataHash) {
          if (currentCount > 0) {
            logPollingUpdate('Direct polling', currentCount, latestEntry?.pmData?.pm25);
          }
          
          // Force new reference with fresh deep copy to ensure React re-renders
          setRecordingData(currentData.map(entry => ({ ...entry })));
          setDataCount(currentCount);
          setLastDataHash(dataHash);
        }
      } catch (error) {
        console.error('Error polling recording data:', error);
      }
    };
    
    // Start polling when recording
    if (isRecording) {
      throttledLog('direct-polling-start', '📊 Starting direct polling for recording data');
      // Poll immediately
      pollData();
      
      // Use more frequent polling to compensate for potential browser throttling
      const adjustedInterval = Math.min(pollInterval, 2000); // Cap at 2 seconds max
      intervalRef.current = window.setInterval(pollData, adjustedInterval);
    } else {
      // Still get final data when not recording
      pollData();
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRecording, lastDataHash, pollInterval, recordingFrequency]);
  
  // Also listen to native events for immediate updates
  useEffect(() => {
    const handleNativeDataAdded = (event: any) => {
      throttledLog('direct-hook-event', '📊 Direct hook received native data event');
      const currentData = nativeRecordingService.getRecordingData();
      setRecordingData(currentData.map(entry => ({ ...entry }))); // Force deep copy
      setDataCount(currentData.length);
    };
    
    window.addEventListener('nativeDataAdded', handleNativeDataAdded);
    
    return () => {
      window.removeEventListener('nativeDataAdded', handleNativeDataAdded);
    };
  }, []);
  
  return {
    recordingData,
    dataCount,
    isPolling: intervalRef.current !== null
  };
}