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
  const { currentData, isConnected } = usePMScanBluetooth();

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
  // Watchdog for stalled streams
  const lastSampleTimeRef = useRef<number>(0);
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

      // Emit heartbeat event and log for diagnostics
      window.dispatchEvent(
        new CustomEvent('recording:data-point', {
          detail: { source: 'rt', ts, pm25: currentData.pm25, speed, isMoving },
        })
      );
      logger.debug(
        `➕ Data point added (rt): pm2.5=${currentData.pm25}, speed=${speed.toFixed(2)} m/s, moving=${isMoving}`
      );

      lastDataRef.current = { pm25: currentData.pm25, timestamp: ts };
    })();
  }, [isRecording, currentData, latestLocation, recordingFrequency, updateContextIfNeeded, addDataPoint]);
  // Track when we last saw fresh RT data
  useEffect(() => {
    if (currentData) {
      lastSampleTimeRef.current = Date.now();
    }
  }, [currentData]);

  // Watchdog: if RT stream stalls while recording, add a point to keep graph/live log flowing
  useEffect(() => {
    if (!isRecording) return;
    const id = setInterval(() => {
      if (!isConnected || !currentData) return;
      const now = Date.now();
      if (now - (lastSampleTimeRef.current || 0) > 5000) {
        const selectedLocation = localStorage.getItem('recording-location') || '';
        const selectedActivity = localStorage.getItem('recording-activity') || '';
        addDataPoint(
          currentData,
          latestLocation || undefined,
          { location: selectedLocation, activity: selectedActivity }
        );
        const age = now - (lastSampleTimeRef.current || 0);
        lastSampleTimeRef.current = now;
        // Emit heartbeat for watchdog action
        window.dispatchEvent(
          new CustomEvent('recording:data-point', {
            detail: { source: 'watchdog', ts: now, pm25: currentData.pm25 },
          })
        );
        logger.debug(`⏱️ Watchdog added data point due to stalled stream (age=${(age/1000).toFixed(1)}s)`);
      }
    }, 3000);
    return () => clearInterval(id);
  }, [isRecording, isConnected, currentData, latestLocation, addDataPoint]);

  return null;
}
