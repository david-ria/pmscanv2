import { useEffect, useRef, useCallback } from 'react';
import { useUnifiedData } from '@/components/UnifiedDataProvider';
import { useAutoContextSampling } from '@/hooks/useAutoContextSampling';
import { useStorageSettings } from '@/hooks/useStorage';
import { STORAGE_KEYS } from '@/services/storageService';
import { useLocationEnrichmentIntegration } from '@/hooks/useLocationEnrichmentIntegration';

import { useWeatherData } from '@/hooks/useWeatherData';
import { useWeatherLogging } from '@/hooks/useWeatherLogging';
import * as logger from '@/utils/logger';
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
    isConnected,
  } = unifiedData;

  // Enhanced debugging for recording state
  console.log('🔍 GlobalDataCollector FULL STATE DEBUG:', {
    isRecording,
    hasCurrentData: !!currentData,
    currentDataTimestamp: currentData?.timestamp?.toISOString(),
    currentDataPM25: currentData?.pm25,
    isConnected,
    hasAddDataPoint: !!addDataPoint,
    recordingFrequency,
    missionContext,
    hasLatestLocation: !!latestLocation,
    willProceed: isRecording && !!currentData && !!addDataPoint,
    // Break down the conditions:
    condition1_isRecording: isRecording,
    condition2_hasCurrentData: !!currentData,
    condition3_hasAddDataPoint: !!addDataPoint,
    finalResult: isRecording && !!currentData && !!addDataPoint
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

  console.log('🔧 GlobalDataCollector - Location enrichment state:', {
    hasEnrichLocation: !!enrichLocation,
    enrichLocationType: typeof enrichLocation
  });

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

  // Track recording state changes
  useEffect(() => {
    console.log('🚨 RECORDING STATE CHANGED:', { isRecording, timestamp: new Date().toISOString() });
  }, [isRecording]);

  // Track currentData changes
  useEffect(() => {
    console.log('📊 CURRENT DATA CHANGED:', { 
      hasData: !!currentData, 
      pm25: currentData?.pm25,
      timestamp: currentData?.timestamp?.toISOString()
    });
  }, [currentData]);

  // Track addDataPoint availability
  useEffect(() => {
    console.log('🔧 ADD DATA POINT AVAILABILITY:', { 
      hasAddDataPoint: !!addDataPoint,
      timestamp: new Date().toISOString()
    });
  }, [addDataPoint]);

  // Global data collection effect with proper frequency control
  useEffect(() => {
    console.log('🔍 GlobalDataCollector: Data collection effect triggered:', {
      isRecording,
      hasCurrentData: !!currentData,
      isConnected,
      hasAddDataPoint: !!addDataPoint,
      willProceed: isRecording && !!currentData && !!addDataPoint,
      timestamp: new Date().toISOString()
    });

    if (!addDataPoint) {
      console.log('🔄 GlobalDataCollector: Recording service not ready, skipping data collection');
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

      console.log('🔍 Frequency check:', {
        recordingFrequency,
        frequencyMs,
        lastRecordedTime: lastRecordedTimeRef.current?.toISOString(),
        currentTime: currentData.timestamp.toISOString(),
        timeSinceLastMs: lastRecordedTimeRef.current ? (now - lastRecordedTimeRef.current.getTime()) : 'never',
        shouldRecord,
        pm25: currentData.pm25
      });

        if (shouldRecord) {
          console.log('✅ shouldRecord is TRUE - proceeding with enrichment check');
        // We have data, that's what matters - connection status can be unreliable
        // Prevent duplicate data points by checking if this is actually new data
        const currentTimestamp = currentData.timestamp.getTime();
        const isDuplicate =
          lastDataRef.current &&
          lastDataRef.current.pm25 === currentData.pm25 &&
          Math.abs(currentTimestamp - lastDataRef.current.timestamp) < 500; // Less than 500ms apart

        if (!isDuplicate) {
          console.log('🔍 GlobalDataCollector: Adding data point!', {
            pm25: currentData.pm25,
            timestamp: currentData.timestamp,
            frequency: recordingFrequency
          });

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
          
          // Get enriched location if available
          let enrichedLocationName = '';
          console.log('🔍 Location enrichment check:', {
            hasEnrichFunction: !!enrichLocation,
            hasLocation: !!(latestLocation?.latitude && latestLocation?.longitude),
            location: latestLocation ? {
              lat: latestLocation.latitude,
              lng: latestLocation.longitude
            } : null,
            shouldRecord,
            willProceedToEnrichment: shouldRecord && !!enrichLocation && !!(latestLocation?.latitude && latestLocation?.longitude)
          });
          
          if (shouldRecord && enrichLocation && latestLocation?.latitude && latestLocation?.longitude) {
            try {
              console.log('🌍 Enriching location during recording:', {
                lat: latestLocation.latitude,
                lng: latestLocation.longitude,
                timestamp: currentData.timestamp.toISOString()
              });
              
              const enrichmentResult = await enrichLocation(
                latestLocation.latitude,
                latestLocation.longitude,
                currentData.timestamp.toISOString()
              );
              
              console.log('📍 Enrichment result:', enrichmentResult);
              
              if (enrichmentResult?.display_name) {
                // Use display_name for actual location (street address)
                enrichedLocationName = enrichmentResult.display_name;
                console.log('✅ Location enriched successfully:', enrichedLocationName);
                console.log('🌍 === UNIFIED ENRICHMENT RESULT ===', {
                  display_name: enrichmentResult.display_name, // Street address from Nominatim
                  enhanced_context: enrichmentResult.enhanced_context, // Activity context (separate)
                  source: enrichmentResult.source,
                  confidence: enrichmentResult.confidence || 'N/A',
                  timestamp: currentData.timestamp.toISOString()
                });
              } else {
                console.log('⚠️ No display_name in enrichment result');
              }
            } catch (error) {
              console.warn('⚠️ Failed to enrich location during recording:', error);
            }
          } else {
            console.log('⏭️ Skipping location enrichment - missing requirements');
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
              logger.debug('⚠️ Failed to fetch weather data for measurement:', error);
            }
          }

          // Use original PMScan data with its timestamp (no overwriting)
          addDataPoint(
            currentData, // Use original PMScan data with consistent timestamp
            latestLocation || undefined,
            { location: selectedLocation, activity: selectedActivity },
            automaticContext,
            enrichedLocationName // NEW: Pass enriched location separately
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