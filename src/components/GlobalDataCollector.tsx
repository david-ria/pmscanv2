import { useEffect, useRef, useCallback } from 'react';
import { useUnifiedData } from '@/components/UnifiedDataProvider';
import { useAutoContextSampling } from '@/hooks/useAutoContextSampling';
import { useStorageSettings } from '@/hooks/useStorage';
import { STORAGE_KEYS } from '@/services/storageService';
import { useLocationEnrichmentIntegration } from '@/hooks/useLocationEnrichmentIntegration';
import { useGeohashSettings } from '@/hooks/useStorage';
import { encodeGeohash } from '@/utils/geohash';
import { rollingBufferService } from '@/services/rollingBufferService';

import { useWeatherData } from '@/hooks/useWeatherData';
import { useWeatherLogging } from '@/hooks/useWeatherLogging';
import * as logger from '@/utils/logger';
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

  // Enhanced debugging for recording state (rate limited)
  rateLimitedDebug('global-data-collector-state', 5000, '🔍 GlobalDataCollector state:', {
    isRecording,
    hasCurrentData: !!currentData,
    isConnected,
    willProceed: isRecording && !!currentData && !!addDataPoint
  });
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

  // Development-only debugging (rate limited)
  devLogger.debug('🔧 Location enrichment state:', {
    hasEnrichLocation: !!enrichLocation,
    geohashEnabled: geohashSettings.enabled
  });

  // Prevent duplicate data points and track frequency
  const lastDataRef = useRef<{ pm25: number; timestamp: number } | null>(null);
  const lastRecordedTimeRef = useRef<Date | null>(null);

  // Refs pour stabiliser les fonctions dans le useEffect
  const enrichLocationRef = useRef(enrichLocation);
  const updateContextRef = useRef(updateContextIfNeeded);
  const getWeatherRef = useRef(getWeatherForMeasurement);

  // Mettre à jour les refs quand les fonctions changent
  useEffect(() => {
    enrichLocationRef.current = enrichLocation;
  }, [enrichLocation]);

  useEffect(() => {
    updateContextRef.current = updateContextIfNeeded;
  }, [updateContextIfNeeded]);

  useEffect(() => {
    getWeatherRef.current = getWeatherForMeasurement;
  }, [getWeatherForMeasurement]);

  // Get user's manual context selections with sync to recording context
  const selectedLocation = localStorage.getItem('recording-location') || missionContext.location || '';
  const selectedActivity = localStorage.getItem('recording-activity') || missionContext.activity || '';

  // Sync localStorage context with recording context when they differ
  useEffect(() => {
    if (selectedLocation !== missionContext.location || selectedActivity !== missionContext.activity) {
      // Update mission context via recording service - it has its own updateMissionContext method
    }
  }, [selectedLocation, selectedActivity, missionContext]);

  // Track recording state changes (development only)
  useEffect(() => {
    devLogger.info('🚨 Recording state changed:', { isRecording });
  }, [isRecording]);

  // Track currentData changes (development only)  
  useEffect(() => {
    if (currentData) {
      devLogger.debug('📊 Current data available:', { pm25: currentData.pm25 });
    }
  }, [currentData]);

  // Track addDataPoint availability (development only)
  useEffect(() => {
    devLogger.debug('🔧 Add data point availability:', { hasAddDataPoint: !!addDataPoint });
  }, [addDataPoint]);

  // Global data collection effect with controlled frequency using setInterval
  useEffect(() => {
    if (!isRecording || !addDataPoint) {
      rateLimitedDebug('recording-service-not-ready', 5000, '🔄 Recording not active or service not ready');
      return;
    }

    // Parse frequency to get interval in milliseconds
    const getFrequencyMs = (freq: string): number => {
      const num = parseInt(freq);
      if (freq.includes('s')) return num * 1000;
      if (freq.includes('m')) return num * 60 * 1000;
      return 10000; // default 10s
    };

    // Parse frequency to get window size in seconds
    const getFrequencySeconds = (freq: string): number => {
      const num = parseInt(freq);
      if (freq.includes('s')) return num;
      if (freq.includes('m')) return num * 60;
      return 10; // default 10s
    };

    const frequencyMs = getFrequencyMs(recordingFrequency);
    const windowSeconds = getFrequencySeconds(recordingFrequency);

    // Collect data function that runs at controlled intervals
    const collectData = async () => {
      // Read current data from unifiedData directly (not from deps)
      const data = unifiedData.currentData;
      const location = unifiedData.latestLocation;
      const speed = unifiedData.speedKmh;

      rateLimitedDebug('data-collection-interval', 3000, '🔍 Interval data collection:', {
        hasData: !!data,
        hasLocation: !!location
      });

      if (!data) {
        logger.debug('⏭️ No current data available, skipping');
        return;
      }

      // Prevent duplicate data points
      const currentTimestamp = data.timestamp.getTime();
      const isDuplicate =
        lastDataRef.current &&
        lastDataRef.current.pm25 === data.pm25 &&
        Math.abs(currentTimestamp - lastDataRef.current.timestamp) < 500; // Less than 500ms apart

      if (isDuplicate) {
        logger.debug('⏭️ Duplicate data point, skipping');
        return;
      }

      // Get running average from buffer instead of instant data
      const averagedData = rollingBufferService.getAverage(windowSeconds);
      
      if (!averagedData) {
        logger.warn('⚠️ No averaged data available from buffer, skipping data point');
        return;
      }

      devLogger.info('🔍 Adding averaged data point:', { 
        pm25: averagedData.pm25.toFixed(1),
        window: `${windowSeconds}s`
      });

      // Handle context and data point recording
      const isMoving = speed > 2; // Simple threshold for movement detection
      
      // Check if we're online for external services
      const isOnline = navigator.onLine;
      
      // Get enriched location if available - non-blocking when offline
      let enrichedLocationName = '';
      rateLimitedDebug('enrichment-check', 5000, '🔍 Location enrichment check:', {
        hasEnrichFunction: !!enrichLocation,
        hasLocation: !!(location?.latitude && location?.longitude),
        isOnline
      });
      
      if (isOnline && enrichLocationRef.current && location?.latitude && location?.longitude) {
        // Launch enrichment in background - don't block data collection
        enrichLocationRef.current(
          location.latitude,
          location.longitude,
          averagedData.timestamp.toISOString()
        )
          .then(enrichmentResult => {
            if (enrichmentResult?.display_name) {
              devLogger.info('✅ Location enriched:', enrichmentResult.display_name);
            }
          })
          .catch(error => {
            logger.warn('⚠️ Background location enrichment failed:', error);
          });
      } else if (!isOnline) {
        logger.debug('⚠️ Offline - skipping location enrichment');
      }

      const automaticContext = autoContextSettings.enabled ? await updateContextRef.current(
        averagedData,
        location || undefined,
        speed,
        isMoving
      ) : '';

      // Use averaged data timestamp
      lastRecordedTimeRef.current = averagedData.timestamp;

      // Fetch weather data only if online, enabled and location is available
      // Launch in background with timeout - don't block data collection
      let weatherDataId: string | null = null;
      if (isOnline && weatherLoggingEnabled && location?.latitude && location?.longitude) {
        const weatherPromise = Promise.race([
          getWeatherRef.current(
            location.latitude,
            location.longitude,
            averagedData.timestamp
          ),
          new Promise<null>((_, reject) => setTimeout(() => reject('timeout'), 5000))
        ]);
        
        // Don't await - let it run in background
        weatherPromise
          .then(id => {
            if (id) {
              devLogger.debug('✅ Weather data fetched:', id);
            }
          })
          .catch(error => {
            logger.debug('⚠️ Background weather fetch failed:', error);
          });
      } else if (!isOnline) {
        logger.debug('⚠️ Offline - skipping weather fetch');
      }

      // Use averaged PMScan data
      addDataPoint(
        averagedData,
        location || undefined,
        { location: selectedLocation, activity: selectedActivity },
        automaticContext,
        enrichedLocationName,
        geohashSettings.enabled && location?.latitude && location?.longitude 
          ? encodeGeohash(location.latitude, location.longitude, geohashSettings.precision)
          : undefined
      );

      lastDataRef.current = {
        pm25: averagedData.pm25,
        timestamp: currentTimestamp,
      };
    };

    // Collect data immediately on recording start
    collectData();
    
    // Then collect at regular intervals
    logger.info(`⏰ Starting data collection interval: ${frequencyMs}ms (${recordingFrequency})`);
    const intervalId = setInterval(collectData, frequencyMs);
    
    return () => {
      logger.info('🛑 Stopping data collection interval');
      clearInterval(intervalId);
    };
  }, [
    isRecording,
    recordingFrequency,
    addDataPoint,
    selectedLocation,
    selectedActivity,
    weatherLoggingEnabled,
    geohashSettings.enabled,
    geohashSettings.precision,
    autoContextSettings.enabled,
  ]);

  // Clear location history and rolling buffer when recording starts
  useEffect(() => {
    if (isRecording) {
      import('@/utils/speedCalculator').then(({ clearLocationHistory }) => {
        clearLocationHistory();
        devLogger.debug('🏃 Cleared location history for new recording session');
      });
      
      // Clear rolling buffer for fresh averaging window
      rollingBufferService.clear();
      devLogger.debug('🧹 Cleared rolling buffer for new recording session');
    }
  }, [isRecording]);

  // This component doesn't render anything - it just collects data globally
  return null;
}

export default GlobalDataCollector;