import { useCallback, useEffect, useRef } from 'react';
import { parseFrequencyToMs } from '@/lib/recordingUtils';
import * as logger from '@/utils/logger';

interface SensorOptimizationOptions {
  isRecording: boolean;
  recordingFrequency?: string;
  enabled?: boolean;
}

/**
 * Hook to optimize sensor sampling based on recording state and frequency
 * This helps reduce energy consumption by pausing sensors when not recording
 * and matching sampling frequency to user-defined recording frequency
 */
export function useSensorOptimization({
  isRecording,
  recordingFrequency = '10s',
  enabled = true,
}: SensorOptimizationOptions) {
  const lastSampleTimeRef = useRef<number>(0);
  const frequencyMsRef = useRef<number>(parseFrequencyToMs(recordingFrequency));

  // Update frequency when it changes
  useEffect(() => {
    frequencyMsRef.current = parseFrequencyToMs(recordingFrequency);
    logger.debug('🔧 Sensor optimization: Frequency updated', { 
      frequency: recordingFrequency, 
      ms: frequencyMsRef.current 
    });
  }, [recordingFrequency]);

  // Reset sampling time when recording starts
  useEffect(() => {
    if (isRecording) {
      lastSampleTimeRef.current = 0;
      logger.debug('🔧 Sensor optimization: Recording started, reset sample time');
    } else {
      logger.debug('🔧 Sensor optimization: Recording stopped, sensors paused');
    }
  }, [isRecording]);

  /**
   * Check if a sensor should sample data based on frequency and recording state
   */
  const shouldSample = useCallback((): boolean => {
    if (!enabled || !isRecording) {
      return false;
    }

    const now = Date.now();
    const frequencyMs = frequencyMsRef.current;
    
    if (lastSampleTimeRef.current === 0 || (now - lastSampleTimeRef.current) >= frequencyMs) {
      lastSampleTimeRef.current = now;
      return true;
    }
    
    return false;
  }, [enabled, isRecording]);

  /**
   * Force a sample regardless of frequency (useful for initial sampling)
   */
  const forceSample = useCallback((): boolean => {
    if (!enabled || !isRecording) {
      return false;
    }
    
    lastSampleTimeRef.current = Date.now();
    return true;
  }, [enabled, isRecording]);

  /**
   * Get the current sampling interval in milliseconds
   */
  const getSamplingInterval = useCallback((): number => {
    return frequencyMsRef.current;
  }, []);

  return {
    shouldSample,
    forceSample,
    getSamplingInterval,
    isActive: enabled && isRecording,
  };
}