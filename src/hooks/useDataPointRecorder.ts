import { useRef, useCallback } from 'react';
import { PMScanData } from '@/lib/pmscan/types';
import { LocationData } from '@/types/PMScan';
import { RecordingEntry } from '@/types/recording';
import { parseFrequencyToMs, shouldRecordData } from '@/lib/recordingUtils';
import { getBackgroundRecording } from '@/lib/pmscan/globalConnectionManager';
import * as logger from '@/utils/logger';

interface UseDataPointRecorderProps {
  isRecording: boolean;
  recordingFrequency: string;
  storeBackgroundData: (
    pmData: PMScanData,
    location?: LocationData,
    context?: { location: string; activity: string }
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

  const addDataPoint = useCallback(
    (
      pmData: PMScanData,
      location?: LocationData,
      context?: { location: string; activity: string },
      automaticContext?: string
    ) => {
      if (!isRecording) {
        return;
      }

      // Check if enough time has passed based on recording frequency
      const frequencyMs = parseFrequencyToMs(recordingFrequency);

      if (!shouldRecordData(lastRecordedTime.current, frequencyMs)) {
        return;
      }

      // Update last recorded time
      const currentTime = new Date();
      lastRecordedTime.current = currentTime;
      updateLastRecordedTime(currentTime);

      // Use a unique timestamp for each data point
      const uniqueTimestamp = new Date();
      const pmDataWithUniqueTimestamp = {
        ...pmData,
        timestamp: uniqueTimestamp,
      };

      const entry: RecordingEntry = {
        pmData: pmDataWithUniqueTimestamp,
        location,
        context,
        automaticContext,
      };

      // Store data for background processing if background mode is enabled
      if (getBackgroundRecording()) {
        storeBackgroundData(pmDataWithUniqueTimestamp, location, context);
      }

      // Add to recording data
      addDataPointToState(entry);
      logger.rateLimitedDebug('dataRecorder.added', 10000, 'Data point added');
    },
    [
      isRecording,
      recordingFrequency,
      updateLastRecordedTime,
      storeBackgroundData,
      addDataPointToState,
    ]
  );

  return {
    addDataPoint,
  };
}
