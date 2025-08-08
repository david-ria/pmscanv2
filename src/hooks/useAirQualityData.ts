import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import * as logger from '@/utils/logger';

interface AirQualityData {
  id: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  no2_value?: number;
  o3_value?: number;
  station_name?: string;
  station_id?: string;
  data_source: string;
  created_at: string;
  updated_at: string;
}

interface LocationData {
  latitude: number;
  longitude: number;
}

export function useAirQualityData() {
  const [isLoading, setIsLoading] = useState(false);
  const [airQualityData, setAirQualityData] = useState<AirQualityData | null>(null);

  const fetchAirQualityData = useCallback(async (location: LocationData, timestamp?: Date): Promise<AirQualityData | null> => {
    if (!location?.latitude || !location?.longitude) {
      logger.debug('❌ Cannot fetch air quality data: missing location');
      return null;
    }

    setIsLoading(true);
    
    try {
      logger.debug('🌬️ Fetching air quality data for location:', location);
      
      const { data, error } = await supabase.functions.invoke('fetch-atmosud-data', {
        body: {
          latitude: location.latitude,
          longitude: location.longitude,
          timestamp: timestamp ? timestamp.toISOString() : new Date().toISOString(),
        },
      });

      if (error) {
        logger.error('❌ Error fetching air quality data:', error);
        return null;
      }

      if (data?.airQualityData) {
        logger.debug('✅ Air quality data fetched successfully:', data.airQualityData.id);
        setAirQualityData(data.airQualityData);
        return data.airQualityData;
      }

      return null;
    } catch (error) {
      logger.error('❌ Error in air quality data fetch:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getAirQualityForMeasurement = useCallback(async (latitude: number, longitude: number, timestamp: Date): Promise<string | null> => {
    try {
      const airQuality = await fetchAirQualityData({ latitude, longitude }, timestamp);
      return airQuality?.id || null;
    } catch (error) {
      logger.error('❌ Error getting air quality for measurement:', error);
      return null;
    }
  }, [fetchAirQualityData]);

  return {
    airQualityData,
    isLoading,
    fetchAirQualityData,
    getAirQualityForMeasurement,
  };
}