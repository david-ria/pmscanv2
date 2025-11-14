import { useEffect, useRef, useCallback } from 'react';
import { useUnifiedData } from '@/components/UnifiedDataProvider';
import { useAutoContextSampling } from '@/hooks/useAutoContextSampling';
import { useStorageSettings } from '@/hooks/useStorage';
import { STORAGE_KEYS } from '@/services/storageService';
import { useLocationEnrichmentIntegration } from '@/hooks/useLocationEnrichmentIntegration';
import { useGeohashSettings } from '@/hooks/useStorage';
import { encodeGeohash } from '@/utils/geohash';
import { rollingBufferService } from '@/services/rollingBufferService';
import { useGroupSettings } from '@/hooks/useGroupSettings';

import { useWeatherData } from '@/hooks/useWeatherData';
import { useWeatherLogging } from '@/hooks/useWeatherLogging';
import * as logger from '@/utils/logger';
import { devLogger, rateLimitedDebug } from '@/utils/optimizedLogger';
import { createTimestamp } from '@/utils/timeFormat';
import { useScopedRecordingContext } from '@/hooks/useScopedRecordingContext';

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
  
  // Get group settings for geohash privacy
  const { activeGroup, isGroupMode } = useGroupSettings();

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

  // Refs to avoid stale closure in setInterval (fix for GPS not updating)
  const currentDataRef = useRef(currentData);
  const latestLocationRef = useRef(latestLocation);
  const speedRef = useRef(speedKmh);

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

  // Keep GPS refs in sync with latest values (prevents stale closure)
  useEffect(() => {
    currentDataRef.current = currentData;
  }, [currentData]);

  useEffect(() => {
    latestLocationRef.current = latestLocation;
  }, [latestLocation]);

  useEffect(() => {
    speedRef.current = speedKmh;
  }, [speedKmh]);

  // Get user's manual context selections from shared scoped hook
  // This ensures consistency with RealTime page and proper mode isolation
  const { selectedLocation, selectedActivity } = useScopedRecordingContext();

  // Refs to track latest context values (prevents stale closure in collectData)
  const selectedLocationRef = useRef(selectedLocation);
  const selectedActivityRef = useRef(selectedActivity);

  // Keep refs in sync with latest context values
  useEffect(() => {
    selectedLocationRef.current = selectedLocation;
    selectedActivityRef.current = selectedActivity;
  }, [selectedLocation, selectedActivity]);

  // 🔁 Keep recordingService.missionContext in sync with current selection while recording
  useEffect(() => {
    if (isRecording && unifiedData.updateMissionContext) {
      if (selectedLocation || selectedActivity) {
        console.log('🔁 [GlobalDataCollector] Syncing mission context:', {
          location: selectedLocation || 'EMPTY',
          activity: selectedActivity || 'EMPTY'
        });
        unifiedData.updateMissionContext(selectedLocation, selectedActivity);
      }
    }
  }, [isRecording, selectedLocation, selectedActivity, unifiedData.updateMissionContext]);

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
      // Read from refs to avoid stale closure
      const data = currentDataRef.current;
      const location = latestLocationRef.current;
      const speed = speedRef.current;

      rateLimitedDebug('data-collection-interval', 3000, '🔍 Interval data collection:', {
        hasData: !!data,
        hasLocation: !!location,
        lat: location?.latitude.toFixed(6),
        lng: location?.longitude.toFixed(6)
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
      
      // Location enrichment with smart caching and rate limiting
      // Await enrichment to get the result before recording
      let enrichedLocationName = '';
      
      rateLimitedDebug('enrichment-check', 8000, '🔍 Location enrichment check:', {
        hasEnrichFunction: !!enrichLocation,
        hasLocation: !!(location?.latitude && location?.longitude),
        isOnline
      });
      
      if (isOnline && enrichLocationRef.current && location?.latitude && location?.longitude) {
        try {
          const enrichmentResult = await Promise.race([
            enrichLocationRef.current(
              location.latitude,
              location.longitude,
              averagedData.timestamp.toISOString()
            ),
            new Promise<null>((_, reject) => setTimeout(() => reject(new Error('Enrichment timeout')), 3000))
          ]);
          
          if (enrichmentResult?.display_name) {
            enrichedLocationName = enrichmentResult.display_name;
            devLogger.info('✅ Location enriched:', {
              name: enrichmentResult.display_name,
              source: enrichmentResult.source,
              confidence: enrichmentResult.confidence
            });
          }
        } catch (error) {
          logger.debug('⚠️ Location enrichment skipped:', error instanceof Error ? error.message : 'Unknown error');
        }
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
      // Await weather fetch to ensure we have the ID before recording
      let weatherDataId: string | null = null;
      if (isOnline && weatherLoggingEnabled && location?.latitude && location?.longitude) {
        try {
          weatherDataId = await Promise.race([
            getWeatherRef.current(
              location.latitude,
              location.longitude,
              averagedData.timestamp
            ),
            new Promise<null>((_, reject) => setTimeout(() => reject(new Error('Weather fetch timeout')), 5000))
          ]);
          
          if (weatherDataId) {
            devLogger.debug('✅ Weather data fetched:', weatherDataId);
          }
        } catch (error) {
          logger.debug('⚠️ Weather fetch failed:', error instanceof Error ? error.message : 'Unknown error');
        }
      } else if (!isOnline) {
        logger.debug('⚠️ Offline - skipping weather fetch');
      }

      // 🔍 DEBUG: Log context being passed to addDataPoint
      console.log('📊 [GlobalDataCollector] Adding data point with context:', {
        location: selectedLocationRef.current || 'EMPTY',
        activity: selectedActivityRef.current || 'EMPTY',
        pm25: averagedData.pm25.toFixed(1),
        timestamp: new Date().toISOString()
      });

      // Generate geohash based on group settings or personal settings
      // When in group mode with geohash privacy enabled, use group's precision
      const shouldGenerateGeohash = location?.latitude && location?.longitude && (
        geohashSettings.enabled || // Personal preference
        (isGroupMode && activeGroup?.settings?.geohash_privacy_enabled) // Group requirement
      );

      const effectiveGeohashPrecision = isGroupMode && activeGroup?.settings?.geohash_privacy_enabled
        ? activeGroup.settings.geohash_precision || 6
        : geohashSettings.precision;

      const geohash = shouldGenerateGeohash
        ? encodeGeohash(location.latitude, location.longitude, effectiveGeohashPrecision)
        : undefined;

      // Use averaged PMScan data with current context
      // Note: Exact GPS is ALWAYS stored for user's own data
      // The geohash is for group privacy when data is shared with other members
      addDataPoint(
        averagedData,
        location || undefined,
        { location: selectedLocationRef.current, activity: selectedActivityRef.current },
        automaticContext,
        enrichedLocationName,
        geohash,
        weatherDataId || undefined
      );
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
    // Note: selectedLocation/selectedActivity, weatherLoggingEnabled, geohashSettings, and autoContextSettings
    // are intentionally NOT in deps - they're read directly inside collectData
    // Adding them would recreate the interval on every change, causing recording pauses
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