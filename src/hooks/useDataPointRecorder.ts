import { useRef, useCallback } from 'react';
import { PMScanData } from '@/lib/pmscan/types';
import { LocationData } from '@/types/PMScan';
import { RecordingEntry } from '@/types/recording';
import { parseFrequencyToMs, shouldRecordData } from '@/lib/recordingUtils';
import { getBackgroundRecording } from '@/lib/pmscan/globalConnectionManager';
import { useWeatherData } from '@/hooks/useWeatherData';
import { useWeatherLogging } from '@/hooks/useWeatherLogging';
import * as logger from '@/utils/logger';
import { logTimestamp } from '@/utils/timestampDebug';
import { createTimestamp, toISOString } from '@/utils/timeFormat';

interface UseDataPointRecorderProps {
  isRecording: boolean;
  recordingFrequency: string;
  storeBackgroundData: (
    pmData: PMScanData,
    location?: LocationData,
    context?: { location: string; activity: string },
    weatherDataId?: string
  ) => void;
  addDataPointToState: (entry: RecordingEntry) => void;
  updateLastRecordedTime: (time: Date) => void;
}

export function useDataPointRecorder({
  isRecording,
  recordingFrequency,
  storeBackgroundData,
  addDataPointToState,
  updateLastRecordedTime,
}: UseDataPointRecorderProps) {
  const lastRecordedTime = useRef<Date | null>(null);
  const { getWeatherForMeasurement } = useWeatherData();
  const { isEnabled: weatherLoggingEnabled } = useWeatherLogging();

  const addDataPoint = useCallback(
    async (
      pmData: PMScanData,
      location?: LocationData,
      context?: { location: string; activity: string },
      automaticContext?: string
    ) => {
      // Allow direct usage for adding data points
      if (!isRecording) {
        logger.debug('📝 Not recording, skipping data point');
        return;
      }

      // Check if enough time has passed based on recording frequency
      const frequencyMs = parseFrequencyToMs(recordingFrequency);

      if (!shouldRecordData(lastRecordedTime.current, frequencyMs)) {
        return;
      }

      // Update last recorded time using standardized timestamp creation
      const currentTime = createTimestamp();
      lastRecordedTime.current = currentTime;
      updateLastRecordedTime(currentTime);
      
      // Debug timestamp creation
      logTimestamp({
        component: 'DataPointRecorder',
        operation: 'createTimestamp',
        timestamp: currentTime,
        source: 'useDataPointRecorder.addDataPoint',
        metadata: { frequency: recordingFrequency }
      });

      // Use the current recorded time as the definitive timestamp
      const pmDataWithTimestamp = {
        ...pmData,
        timestamp: currentTime, // Use single, consistent timestamp
      };

      // Fetch weather data only if enabled and location is available
      let weatherDataId: string | null = null;
      if (weatherLoggingEnabled && location?.latitude && location?.longitude) {
        try {
          weatherDataId = await getWeatherForMeasurement(
            location.latitude,
            location.longitude,
            currentTime
          );
        } catch (error) {
          logger.debug('⚠️ Failed to fetch weather data for measurement:', error);
        }
      }

      const entry: RecordingEntry = {
        pmData: pmDataWithTimestamp,
        location,
        context,
        automaticContext,
        timestamp: currentTime, // Use single, consistent timestamp
        weatherDataId,
      };

      // Debug recording entry creation
      console.log('📊 Recording entry context debug:', {
        hasContext: !!context,
        location: context?.location,
        activity: context?.activity,
        automaticContext,
        timestamp: toISOString(currentTime)
      });

      // Store data for background processing if background mode is enabled
      if (getBackgroundRecording()) {
        storeBackgroundData(pmDataWithTimestamp, location, context, weatherDataId);
      }

      // Add to recording data
      addDataPointToState(entry);
      logger.rateLimitedDebug('dataRecorder.added', 10000, 'Data point added with weather data');
    },
    [
      isRecording,
      recordingFrequency,
      updateLastRecordedTime,
      storeBackgroundData,
      addDataPointToState,
      getWeatherForMeasurement,
      weatherLoggingEnabled,
    ]
  );

  return {
    addDataPoint,
  };
}
