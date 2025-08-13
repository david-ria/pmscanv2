import { useEffect, useRef, useCallback } from 'react';
import { usePMScanBluetooth } from '@/hooks/usePMScanBluetooth';
import { useRecordingContext } from '@/contexts/RecordingContext';
import { useGPS } from '@/hooks/useGPS';
import { useAutoContextSampling } from '@/hooks/useAutoContextSampling';
import { useStorageSettings } from '@/hooks/useStorage';
import { STORAGE_KEYS } from '@/services/storageService';
import { parseFrequencyToMs, shouldRecordData } from '@/lib/recordingUtils';
import { useWeatherData } from '@/hooks/useWeatherData';
import { useWeatherLogging } from '@/hooks/useWeatherLogging';
import * as logger from '@/utils/logger';
import { createTimestamp } from '@/utils/timeFormat';

/**
 * Global data collector that runs independently of page navigation
 * This ensures recording continues even when navigating away from real-time page
 */
export function GlobalDataCollector() {
  const { currentData, isConnected } = usePMScanBluetooth();
  const recordingContext = useRecordingContext();

  const {
    isRecording = false,
    addDataPoint,
    recordingFrequency = '10s',
    missionContext = { location: '', activity: '' },
    updateMissionContext,
  } = recordingContext || {};
  
  const { latestLocation } = useGPS(true, false, recordingFrequency);
  const { getWeatherForMeasurement } = useWeatherData();
  const { isEnabled: weatherLoggingEnabled } = useWeatherLogging();
  
  // Auto context sampling
  const { settings: autoContextSettings } = useStorageSettings(
    STORAGE_KEYS.AUTO_CONTEXT_SETTINGS,
    { enabled: false }
  );
  
  const { updateContextIfNeeded } = useAutoContextSampling({
    recordingFrequency,
    isRecording: isRecording && autoContextSettings.enabled,
  });

  // Prevent duplicate data points and track frequency
  const lastDataRef = useRef<{ pm25: number; timestamp: number } | null>(null);
  const lastRecordedTimeRef = useRef<Date | null>(null);

  // Get user's manual context selections with sync to recording context
  const selectedLocation = localStorage.getItem('recording-location') || missionContext.location || '';
  const selectedActivity = localStorage.getItem('recording-activity') || missionContext.activity || '';

  // Sync localStorage context with recording context when they differ
  useEffect(() => {
    if (updateMissionContext && (selectedLocation !== missionContext.location || selectedActivity !== missionContext.activity)) {
      updateMissionContext(selectedLocation, selectedActivity);
    }
  }, [selectedLocation, selectedActivity, missionContext, updateMissionContext]);

  // Global data collection effect with proper frequency control
  useEffect(() => {
    if (!recordingContext || !addDataPoint) {
      logger.debug('🔄 GlobalDataCollector: Recording context not ready, skipping data collection');
      return;
    }

    if (isRecording && currentData && isConnected) {
      // Prevent duplicate data points by checking if this is actually new data
      const currentTimestamp = currentData.timestamp.getTime();
      const isDuplicate =
        lastDataRef.current &&
        lastDataRef.current.pm25 === currentData.pm25 &&
        Math.abs(currentTimestamp - lastDataRef.current.timestamp) < 500; // Less than 500ms apart

      if (!isDuplicate) {
        // Check if enough time has passed based on recording frequency
        const frequencyMs = parseFrequencyToMs(recordingFrequency);
        
        if (!shouldRecordData(lastRecordedTimeRef.current, frequencyMs)) {
          return;
        }

        logger.rateLimitedDebug(
          'globalDataCollector.addData',
          5000,
          'Adding data point globally with location:',
          latestLocation
        );

        // Handle context and data point recording
        const handleContextAndDataPoint = async () => {
          // Calculate speed and movement from GPS data
          let speed = 0;
          let isMoving = false;
          
          if (latestLocation) {
            const { updateLocationHistory } = await import('@/utils/speedCalculator');
            const speedData = updateLocationHistory(
              latestLocation.latitude,
              latestLocation.longitude,
              latestLocation.timestamp
            );
            speed = speedData.speed;
            isMoving = speedData.isMoving;
          }
          
          const automaticContext = await updateContextIfNeeded(
            currentData,
            latestLocation || undefined,
            speed,
            isMoving
          );

          // Update last recorded time using standardized timestamp creation
          const recordingTime = createTimestamp();
          lastRecordedTimeRef.current = recordingTime;

          // Fetch weather data only if enabled and location is available
          let weatherDataId: string | null = null;
          if (weatherLoggingEnabled && latestLocation?.latitude && latestLocation?.longitude) {
            try {
              weatherDataId = await getWeatherForMeasurement(
                latestLocation.latitude,
                latestLocation.longitude,
                recordingTime
              );
            } catch (error) {
              logger.debug('⚠️ Failed to fetch weather data for measurement:', error);
            }
          }

          // Use the current recorded time as the definitive timestamp for consistency
          const pmDataWithTimestamp = {
            ...currentData,
            timestamp: recordingTime,
          };

          // Add data point with user's manual context selections
          addDataPoint(
            pmDataWithTimestamp,
            latestLocation || undefined,
            { location: selectedLocation, activity: selectedActivity },
            automaticContext
          );
        };

        handleContextAndDataPoint();
        
        lastDataRef.current = {
          pm25: currentData.pm25,
          timestamp: currentTimestamp,
        };
      }
    }
  }, [
    recordingContext,
    isRecording,
    currentData,
    isConnected,
    latestLocation,
    addDataPoint,
    selectedLocation,
    selectedActivity,
    updateContextIfNeeded,
    recordingFrequency,
    getWeatherForMeasurement,
    weatherLoggingEnabled,
  ]);

  // Clear location history when recording starts for fresh speed calculations
  useEffect(() => {
    if (isRecording) {
      import('@/utils/speedCalculator').then(({ clearLocationHistory }) => {
        clearLocationHistory();
        if (process.env.NODE_ENV === 'development') {
          console.log('🏃 Cleared location history for new recording session (global)');
        }
      });
    }
  }, [isRecording]);

  // This component doesn't render anything - it just collects data globally
  return null;
}

export default GlobalDataCollector;