import { useState, useEffect, useRef } from 'react';
import { nativeRecordingService } from '@/services/nativeRecordingService';

/**
 * Hook that directly polls the native recording service for real-time data updates
 * Bypasses React context to ensure immediate updates
 */
export function useDirectRecordingData(isRecording: boolean, pollInterval: number = 500) {
  const [recordingData, setRecordingData] = useState<any[]>([]);
  const [dataCount, setDataCount] = useState(0);
  const intervalRef = useRef<number | null>(null);
  
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Direct polling function
    const pollData = () => {
      try {
        const currentData = nativeRecordingService.getRecordingData();
        const currentCount = currentData.length;
        
        // Only update if data actually changed
        if (currentCount !== dataCount) {
          console.log('📊 Direct polling: data changed from', dataCount, 'to', currentCount);
          setRecordingData([...currentData]); // Create new array reference to force re-render
          setDataCount(currentCount);
        }
      } catch (error) {
        console.error('Error polling recording data:', error);
      }
    };
    
    // Start aggressive polling when recording
    if (isRecording) {
      console.log('📊 Starting direct polling for recording data');
      // Poll immediately
      pollData();
      
      // Set up interval for continuous polling
      intervalRef.current = window.setInterval(pollData, pollInterval);
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
  }, [isRecording, dataCount, pollInterval]);
  
  // Also listen to native events for immediate updates
  useEffect(() => {
    const handleNativeDataAdded = (event: any) => {
      console.log('📊 Direct hook received native data event');
      const currentData = nativeRecordingService.getRecordingData();
      setRecordingData([...currentData]); // Force new reference
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