import { useEffect, useRef, useCallback } from 'react';
import { useUnifiedData } from '@/components/UnifiedDataProvider';
import { useAutoContextSampling } from '@/hooks/useAutoContextSampling';
import { useStorageSettings } from '@/hooks/useStorage';
import { STORAGE_KEYS } from '@/services/storageService';
import { useLocationEnrichmentIntegration } from '@/hooks/useLocationEnrichmentIntegration';
import { useGeohashSettings } from '@/hooks/useStorage';
import { encodeGeohash } from '@/utils/geohash';

import { useWeatherData } from '@/hooks/useWeatherData';
import { useWeatherLogging } from '@/hooks/useWeatherLogging';
import { devLogger, rateLimitedDebug } from '@/utils/optimizedLogger';
import { createTimestamp } from '@/utils/timeFormat';

/**
 * Global data collector that runs independently of page navigation
 * This ensures recording continues even when navigating away from real-time page
 */
export function GlobalDataCollector() {
  // Get all data from unified source
  const unifiedData = useUnifiedData();
  const {
    currentData,
    isRecording,
    addDataPoint,
    recordingFrequency,
    missionContext,
    latestLocation,
    speedKmh,
    gpsQuality,
    isConnected,
  } = unifiedData;

  // Rate-limited debugging for recording state - only log when state changes
  rateLimitedDebug(
    'global-data-collector-state',
    5000,
    '🔍 GlobalDataCollector STATE:', {
      isRecording,
      hasCurrentData: !!currentData,
      isConnected,
      hasAddDataPoint: !!addDataPoint,
      willProceed: isRecording && !!currentData && !!addDataPoint
    }
  );
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

  // Location enrichment integration
  const { enrichLocation } = useLocationEnrichmentIntegration();

  // Get geohash settings
  const { settings: geohashSettings } = useGeohashSettings();

  // Only log enrichment state changes in development
  devLogger.debug('Location enrichment state', {
    hasEnrichLocation: !!enrichLocation,
    enrichLocationType: typeof enrichLocation
  });

  // Rate-limited geohash debug logging
  rateLimitedDebug(
    'geohash-state',
    10000,
    '🗺️ GEOHASH STATE:', {
      enabled: geohashSettings.enabled,
      hasLocation: !!latestLocation,
      isRecording,
      willGenerate: geohashSettings.enabled && !!latestLocation && isRecording && !!currentData
    }
  );

  // Prevent duplicate data points and track frequency
  const lastDataRef = useRef<{ pm25: number; timestamp: number } | null>(null);
  const lastRecordedTimeRef = useRef<Date | null>(null);

  // Get user's manual context selections with sync to recording context
  const selectedLocation = localStorage.getItem('recording-location') || missionContext.location || '';
  const selectedActivity = localStorage.getItem('recording-activity') || missionContext.activity || '';

  // Sync localStorage context with recording context when they differ
  useEffect(() => {
    if (selectedLocation !== missionContext.location || selectedActivity !== missionContext.activity) {
      // Update mission context via recording service - it has its own updateMissionContext method
    }
  }, [selectedLocation, selectedActivity, missionContext]);

  // Track recording state changes - only log important state changes
  useEffect(() => {
    devLogger.info(`Recording state changed: ${isRecording ? 'STARTED' : 'STOPPED'}`);
  }, [isRecording]);

  // Track currentData availability - rate limited
  useEffect(() => {
    rateLimitedDebug(
      'current-data-availability',
      3000,
      '📊 Data availability:', { 
        hasData: !!currentData, 
        pm25: currentData?.pm25
      }
    );
  }, [currentData]);

  // Track addDataPoint availability - only when it changes
  useEffect(() => {
    devLogger.debug('Recording service availability', { hasAddDataPoint: !!addDataPoint });
  }, [addDataPoint]);

  // Global data collection effect with proper frequency control
  useEffect(() => {
    // Only log when recording is active
    if (isRecording) {
      rateLimitedDebug(
        'data-collection-trigger',
        2000,
        '🔍 Data collection triggered:', {
          hasCurrentData: !!currentData,
          isConnected,
          willProceed: !!currentData && !!addDataPoint
        }
      );
    }

    if (!addDataPoint) {
      devLogger.debug('Recording service not ready, skipping data collection');
      return;
    }

    if (isRecording && currentData) {
      // Parse frequency to get interval in milliseconds
      const getFrequencyMs = (freq: string): number => {
        const num = parseInt(freq);
        if (freq.includes('s')) return num * 1000;
        if (freq.includes('m')) return num * 60 * 1000;
        return 10000; // default 10s
      };

      const frequencyMs = getFrequencyMs(recordingFrequency);
      const now = currentData.timestamp.getTime();
      
      // Check if enough time has passed since last recording
      const shouldRecord = !lastRecordedTimeRef.current || 
        (now - lastRecordedTimeRef.current.getTime()) >= frequencyMs;

      // Rate-limited frequency logging
      rateLimitedDebug(
        'frequency-check',
        5000,
        '🔍 Frequency check:', {
          frequency: recordingFrequency,
          shouldRecord,
          pm25: currentData.pm25
        }
      );

        if (shouldRecord) {
          devLogger.debug('Recording data point', { pm25: currentData.pm25 });
        // We have data, that's what matters - connection status can be unreliable
        // Prevent duplicate data points by checking if this is actually new data
        const currentTimestamp = currentData.timestamp.getTime();
        const isDuplicate =
          lastDataRef.current &&
          lastDataRef.current.pm25 === currentData.pm25 &&
          Math.abs(currentTimestamp - lastDataRef.current.timestamp) < 500; // Less than 500ms apart

        if (!isDuplicate) {
          devLogger.info('Adding data point', {
            pm25: currentData.pm25,
            frequency: recordingFrequency
          });

        // Handle context and data point recording
        const handleContextAndDataPoint = async () => {
          // Use speed from GPS hook (already calculated with EMA smoothing)
          const speed = speedKmh;
          const isMoving = speed > 2; // Simple threshold for movement detection
          
          // Get enriched location if available
          let enrichedLocationName = '';
          // Rate-limited enrichment logging
          rateLimitedDebug(
            'enrichment-check',
            3000,
            '🔍 Location enrichment check:', {
              hasFunction: !!enrichLocation,
              hasLocation: !!(latestLocation?.latitude && latestLocation?.longitude),
              willProceed: shouldRecord && !!enrichLocation && !!(latestLocation?.latitude && latestLocation?.longitude)
            }
          );
          
          if (shouldRecord && enrichLocation && latestLocation?.latitude && latestLocation?.longitude) {
            try {
              devLogger.debug('Enriching location during recording', {
                lat: latestLocation.latitude,
                lng: latestLocation.longitude
              });
              
              const enrichmentResult = await enrichLocation(
                latestLocation.latitude,
                latestLocation.longitude,
                currentData.timestamp.toISOString()
              );
              
              if (enrichmentResult?.display_name) {
                enrichedLocationName = enrichmentResult.display_name;
                devLogger.info('Location enriched successfully', {
                  display_name: enrichmentResult.display_name,
                  source: enrichmentResult.source
                });
              }
            } catch (error) {
              console.warn('Failed to enrich location during recording:', error);
            }
          }

          const automaticContext = autoContextSettings.enabled ? await updateContextIfNeeded(
            currentData,
            latestLocation || undefined,
            speed,
            isMoving
            // DO NOT pass enrichedLocationName - keep autocontext separate from location enrichment
          ) : '';

          // Use PMScan data timestamp (already standardized) - no need to overwrite
          lastRecordedTimeRef.current = currentData.timestamp;

          // Fetch weather data only if enabled and location is available
          let weatherDataId: string | null = null;
          if (weatherLoggingEnabled && latestLocation?.latitude && latestLocation?.longitude) {
            try {
              weatherDataId = await getWeatherForMeasurement(
                latestLocation.latitude,
                latestLocation.longitude,
                currentData.timestamp // Use PMScan timestamp consistently
              );
            } catch (error) {
              devLogger.debug('Failed to fetch weather data for measurement:', error);
            }
          }

          // Use original PMScan data with its timestamp (no overwriting)
          addDataPoint(
            currentData, // Use original PMScan data with consistent timestamp
            latestLocation || undefined,
            { location: selectedLocation, activity: selectedActivity },
            automaticContext,
            enrichedLocationName, // NEW: Pass enriched location separately
            geohashSettings.enabled && latestLocation?.latitude && latestLocation?.longitude 
              ? encodeGeohash(latestLocation.latitude, latestLocation.longitude, geohashSettings.precision)
              : undefined // NEW: Pass geohash when enabled and location available
          );
        };

        handleContextAndDataPoint();
        
        lastDataRef.current = {
          pm25: currentData.pm25,
          timestamp: currentTimestamp,
        };
        
        // Update last recorded time for frequency control
        lastRecordedTimeRef.current = currentData.timestamp;
        }
      }
    }
  }, [
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
    enrichLocation,
    geohashSettings,
    encodeGeohash,
  ]);

  // Clear location history when recording starts for fresh speed calculations
  useEffect(() => {
    if (isRecording) {
      import('@/utils/speedCalculator').then(({ clearLocationHistory }) => {
        clearLocationHistory();
        devLogger.debug('Cleared location history for new recording session');
      });
    }
  }, [isRecording]);

  // This component doesn't render anything - it just collects data globally
  return null;
}

export default GlobalDataCollector;