import { useCallback } from 'react';
import { useBackgroundRecording } from './useBackgroundRecording';
import { parseFrequencyToMs } from '@/lib/recordingUtils';
import { PMScanData } from '@/lib/pmscan/types';
import { LocationData } from '@/types/PMScan';
import * as logger from '@/utils/logger';

export function useBackgroundRecordingIntegration() {
  const {
    isBackgroundEnabled,
    enableBackgroundRecording,
    disableBackgroundRecording,
    storeDataForBackground,
  } = useBackgroundRecording();

  const enableRecordingBackground = useCallback(async (frequency: string) => {
    try {
      await enableBackgroundRecording({
        enableWakeLock: true,
        enableNotifications: true,
        syncInterval: parseFrequencyToMs(frequency),
      });
      logger.debug('🎯 Background recording enabled');
    } catch (error) {
      console.warn('⚠️ Background recording failed to enable:', error);
    }
  }, [enableBackgroundRecording]);

  const disableRecordingBackground = useCallback(async () => {
    try {
      await disableBackgroundRecording();
      logger.debug('🛑 Background recording disabled');
    } catch (error) {
      console.warn('⚠️ Background recording failed to disable:', error);
    }
  }, [disableBackgroundRecording]);

  const storeBackgroundData = useCallback((
    pmData: PMScanData,
    location?: LocationData,
    context?: { location: string; activity: string },
    weatherDataId?: string
  ) => {
    if (isBackgroundEnabled) {
      storeDataForBackground(pmData, location, { ...context, weatherDataId });
    }
  }, [isBackgroundEnabled, storeDataForBackground]);

  return {
    isBackgroundEnabled,
    enableRecordingBackground,
    disableRecordingBackground,
    storeBackgroundData,
  };
}
