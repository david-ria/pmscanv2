import { useEffect, useRef, useCallback } from 'react';
import { useRecordingContext } from '@/contexts/RecordingContext';
import { useStorageSettings } from '@/hooks/useStorage';
import { STORAGE_KEYS } from '@/services/storageService';
import { useAutoContext } from '@/hooks/useAutoContext';
import { useAutoContextSampling } from '@/hooks/useAutoContextSampling';
import { useGPS } from '@/hooks/useGPS';
import { usePMScanBluetooth } from '@/hooks/usePMScanBluetooth';
import * as logger from '@/utils/logger';

/**
 * Global, headless recorder that continues to add data points during navigation
 * or when leaving the Real-Time screen. No UI.
 */
export function RecordingDataCollector() {
  const { isRecording, addDataPoint, recordingFrequency } = useRecordingContext();
  const { currentData } = usePMScanBluetooth();

  // Location is needed for data points and auto-context
  const { latestLocation } = useGPS(true, false, recordingFrequency, isRecording);

  // Auto-context settings and helpers
  const { settings: autoContextSettings } = useStorageSettings(
    STORAGE_KEYS.AUTO_CONTEXT_SETTINGS,
    { enabled: false }
  );

  const autoContextResult = useAutoContext(
    isRecording && autoContextSettings.enabled,
    latestLocation
  );

  const { updateContextIfNeeded } = useAutoContextSampling({
    recordingFrequency,
    isRecording,
  });

  // Dedupe consecutive identical samples
  const lastDataRef = useRef<{ pm25: number; timestamp: number } | null>(null);

  useEffect(() => {
    logger.debug('🛰️ RecordingDataCollector mounted');
    return () => logger.debug('🛰️ RecordingDataCollector unmounted');
  }, []);

  useEffect(() => {
    if (!isRecording || !currentData) return;

    const ts = currentData.timestamp.getTime();
    const dup =
      lastDataRef.current?.pm25 === currentData.pm25 &&
      Math.abs(ts - (lastDataRef.current?.timestamp ?? 0)) < 500;
    if (dup) return;

    (async () => {
      // Compute speed/motion using worker (fallback if needed)
      let speed = 0, isMoving = false;
      if (latestLocation) {
        try {
          const { speedWorkerManager } = await import('@/lib/speedWorkerManager');
          const result = await speedWorkerManager.calculateSpeed(
            latestLocation.latitude,
            latestLocation.longitude,
            latestLocation.timestamp.getTime()
          );
          speed = result.speed;
          isMoving = result.isMoving;
        } catch (error) {
          logger.debug('Speed worker failed, using fallback', error);
          const { updateLocationHistory } = await import('@/utils/speedCalculator');
          const sp = updateLocationHistory(
            latestLocation?.latitude!,
            latestLocation?.longitude!,
            latestLocation?.timestamp!
          );
          speed = sp.speed;
          isMoving = sp.isMoving;
        }
      }

      const automaticContext = await updateContextIfNeeded(
        currentData,
        latestLocation || undefined,
        speed,
        isMoving
      );

      const selectedLocation = localStorage.getItem('recording-location') || '';
      const selectedActivity = localStorage.getItem('recording-activity') || '';

      addDataPoint(
        currentData,
        latestLocation || undefined,
        { location: selectedLocation, activity: selectedActivity },
        automaticContext
      );

      lastDataRef.current = { pm25: currentData.pm25, timestamp: ts };
    })();
  }, [isRecording, currentData, latestLocation, recordingFrequency, updateContextIfNeeded, addDataPoint]);


  return null;
}
