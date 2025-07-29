import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import * as logger from '@/utils/logger';
import { useSensorOptimization } from './useSensorOptimization';

interface WeatherData {
  id: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  temperature: number;
  humidity: number;
  pressure: number;
  weather_main: string;
  weather_description: string;
  wind_speed?: number;
  wind_direction?: number;
  visibility?: number;
  uv_index?: number;
  created_at: string;
  updated_at: string;
}

interface LocationData {
  latitude: number;
  longitude: number;
}

interface UseWeatherDataOptions {
  isRecording?: boolean;
  recordingFrequency?: string;
  enabled?: boolean;
}

export function useWeatherData(options: UseWeatherDataOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  
  const {
    isRecording = false,
    recordingFrequency = '10s',
    enabled = true,
  } = options;

  const sensorOptimization = useSensorOptimization({
    isRecording,
    recordingFrequency,
    enabled,
  });

  const lastFetchTimeRef = useRef<number>(0);

  const fetchWeatherData = useCallback(async (location: LocationData, timestamp?: Date, forceUpdate = false): Promise<WeatherData | null> => {
    if (!location?.latitude || !location?.longitude) {
      logger.debug('❌ Cannot fetch weather data: missing location');
      return null;
    }

    // Check if we should sample based on recording state and frequency
    if (!forceUpdate && !sensorOptimization.shouldSample()) {
      logger.debug('❌ Weather data fetch skipped due to frequency/recording constraints');
      return weatherData; // Return cached data
    }

    setIsLoading(true);
    
    try {
      logger.debug('🌤️ Fetching weather data for location:', location);
      
      const { data, error } = await supabase.functions.invoke('fetch-weather', {
        body: {
          latitude: location.latitude,
          longitude: location.longitude,
          timestamp: timestamp ? timestamp.toISOString() : new Date().toISOString(),
        },
      });

      if (error) {
        logger.error('❌ Error fetching weather data:', error);
        return null;
      }

      if (data?.weatherData) {
        logger.debug('✅ Weather data fetched successfully:', data.weatherData.id);
        setWeatherData(data.weatherData);
        return data.weatherData;
      }

      return null;
    } catch (error) {
      logger.error('❌ Error in weather data fetch:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [sensorOptimization, weatherData]);

  const getWeatherForMeasurement = useCallback(async (latitude: number, longitude: number, timestamp: Date): Promise<string | null> => {
    try {
      // Force weather fetch for measurements (important for data integrity)
      const weather = await fetchWeatherData({ latitude, longitude }, timestamp, true);
      return weather?.id || null;
    } catch (error) {
      logger.error('❌ Error getting weather for measurement:', error);
      return null;
    }
  }, [fetchWeatherData]);

  return {
    weatherData,
    isLoading,
    fetchWeatherData,
    getWeatherForMeasurement,
  };
}