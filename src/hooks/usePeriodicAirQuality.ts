import { useState, useEffect, useCallback } from 'react';
import { useAirQualityData } from './useAirQualityData';
import { useAirQualityLogging } from './useAirQualityLogging';
import { useGPS } from './useGPS';
import * as logger from '@/utils/logger';

interface AirQualityReading {
  no2_value?: number;
  o3_value?: number;
  station_name?: string;
  timestamp: string;
  lastUpdated: Date;
}

export function usePeriodicAirQuality() {
  const [currentAirQuality, setCurrentAirQuality] = useState<AirQualityReading | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  
  const { fetchAirQualityData } = useAirQualityData();
  const { isEnabled: airQualityLoggingEnabled } = useAirQualityLogging();
  const { latestLocation, locationEnabled } = useGPS();

  const fetchCurrentAirQuality = useCallback(async () => {
    if (!airQualityLoggingEnabled || !locationEnabled || !latestLocation) {
      logger.debug('❌ Cannot fetch periodic air quality: conditions not met', {
        airQualityEnabled: airQualityLoggingEnabled,
        locationEnabled,
        hasLocation: !!latestLocation
      });
      return;
    }

    setIsLoading(true);
    try {
      logger.debug('🌬️ Fetching periodic air quality data');
      const airQualityData = await fetchAirQualityData({
        latitude: latestLocation.latitude,
        longitude: latestLocation.longitude
      });

      if (airQualityData) {
        const reading: AirQualityReading = {
          no2_value: airQualityData.no2_value,
          o3_value: airQualityData.o3_value,
          station_name: airQualityData.station_name,
          timestamp: airQualityData.timestamp,
          lastUpdated: new Date()
        };
        
        setCurrentAirQuality(reading);
        setLastFetchTime(new Date());
        logger.debug('✅ Periodic air quality data updated');
      }
    } catch (error) {
      logger.error('❌ Error fetching periodic air quality:', error);
    } finally {
      setIsLoading(false);
    }
  }, [airQualityLoggingEnabled, locationEnabled, latestLocation, fetchAirQualityData]);

  // Initial fetch when conditions are met
  useEffect(() => {
    if (airQualityLoggingEnabled && locationEnabled && latestLocation) {
      fetchCurrentAirQuality();
    }
  }, [airQualityLoggingEnabled, locationEnabled, latestLocation, fetchCurrentAirQuality]);

  // Set up 30-minute interval
  useEffect(() => {
    if (!airQualityLoggingEnabled) return;

    const interval = setInterval(() => {
      fetchCurrentAirQuality();
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(interval);
  }, [airQualityLoggingEnabled, fetchCurrentAirQuality]);

  // Manual refresh function
  const refreshAirQuality = useCallback(() => {
    fetchCurrentAirQuality();
  }, [fetchCurrentAirQuality]);

  return {
    currentAirQuality,
    isLoading,
    lastFetchTime,
    refreshAirQuality,
    isEnabled: airQualityLoggingEnabled && locationEnabled
  };
}