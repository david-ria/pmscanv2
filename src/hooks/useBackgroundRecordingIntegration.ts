import { useCallback } from 'react';
import { useBackgroundRecording } from './useBackgroundRecording';
import { useNativeBackgroundMode } from './useNativeBackgroundMode';
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

  const {
    isNative,
    platform,
    status: nativeStatus,
    startNativeBackgroundMode,
    stopNativeBackgroundMode,
  } = useNativeBackgroundMode();

  const enableRecordingBackground = useCallback(async (frequency: string) => {
    try {
      // Try native background mode first (for 1+ hour recording)
      if (isNative && nativeStatus.isNativeSupported) {
        const nativeStarted = await startNativeBackgroundMode();
        if (nativeStarted) {
          logger.debug(`🎯 Native background mode enabled (${platform})`);
        } else {
          logger.debug('⚠️ Native background mode failed, falling back to PWA');
        }
      }

      // Always enable PWA background recording as fallback/complement
      await enableBackgroundRecording({
        enableWakeLock: true,
        enableNotifications: true,
        syncInterval: parseFrequencyToMs(frequency),
      });
      
      logger.debug('🎯 Background recording enabled (hybrid mode)');
    } catch (error) {
      console.warn('⚠️ Background recording failed to enable:', error);
    }
  }, [enableBackgroundRecording, isNative, nativeStatus.isNativeSupported, startNativeBackgroundMode, platform]);

  const disableRecordingBackground = useCallback(async () => {
    try {
      // Stop native background mode if active
      if (isNative && nativeStatus.isNativeActive) {
        await stopNativeBackgroundMode();
        logger.debug('🛑 Native background mode disabled');
      }

      // Stop PWA background recording
      await disableBackgroundRecording();
      logger.debug('🛑 Background recording disabled');
    } catch (error) {
      console.warn('⚠️ Background recording failed to disable:', error);
    }
  }, [disableBackgroundRecording, isNative, nativeStatus.isNativeActive, stopNativeBackgroundMode]);

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
    isNative,
    platform,
    nativeStatus,
  };
}
