import { useEffect, useCallback } from 'react';
import * as logger from '@/utils/logger';

interface SensorCoordinatorOptions {
  isRecording: boolean;
  recordingFrequency: string;
  onSensorStateChange?: (sensorName: string, isActive: boolean) => void;
}

/**
 * Coordinates all sensors to optimize energy consumption by:
 * 1. Pausing all sensors when recording stops
 * 2. Resuming sensors when recording starts
 * 3. Managing sampling frequency across all sensors
 * 4. Providing central sensor state management
 */
export function useSensorCoordinator({
  isRecording,
  recordingFrequency,
  onSensorStateChange,
}: SensorCoordinatorOptions) {
  
  // Notify about sensor state changes when recording state changes
  useEffect(() => {
    const sensors = ['GPS', 'Weather', 'AutoContext', 'Bluetooth'];
    
    sensors.forEach(sensor => {
      onSensorStateChange?.(sensor, isRecording);
    });

    if (isRecording) {
      logger.debug('🚀 Sensor Coordinator: All sensors activated', { 
        frequency: recordingFrequency,
        activeSensors: sensors 
      });
    } else {
      logger.debug('⏸️ Sensor Coordinator: All sensors paused for energy saving');
    }
  }, [isRecording, recordingFrequency, onSensorStateChange]);

  /**
   * Get the current sensor configuration
   */
  const getSensorConfig = useCallback(() => {
    return {
      isRecording,
      recordingFrequency,
      energySaving: !isRecording,
    };
  }, [isRecording, recordingFrequency]);

  /**
   * Check if sensors should be active
   */
  const shouldSensorsBeActive = useCallback(() => {
    return isRecording;
  }, [isRecording]);

  return {
    getSensorConfig,
    shouldSensorsBeActive,
    isRecording,
    recordingFrequency,
  };
}