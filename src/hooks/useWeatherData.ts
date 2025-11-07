import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import * as logger from '@/utils/logger';

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

export function useWeatherData() {
  const [isLoading, setIsLoading] = useState(false);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);

  const fetchWeatherData = useCallback(async (location: LocationData, timestamp?: Date): Promise<WeatherData | null> => {
    if (!location?.latitude || !location?.longitude) {
      logger.debug('❌ Cannot fetch weather data: missing location');
      return null;
    }

    // Check if online before attempting fetch
    if (!navigator.onLine) {
      logger.debug('⚠️ Offline - skipping weather fetch');
      return null;
    }

    setIsLoading(true);
    
    try {
      logger.debug('🌤️ Fetching weather data for location:', location);
      
      // Add 5 second timeout to prevent blocking
      const weatherPromise = supabase.functions.invoke('fetch-weather', {
        body: {
          latitude: location.latitude,
          longitude: location.longitude,
          timestamp: timestamp ? timestamp.toISOString() : new Date().toISOString(),
        },
      });
      
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Weather fetch timeout')), 5000)
      );
      
      const { data, error } = await Promise.race([weatherPromise, timeoutPromise]);

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
  }, []);

  const getWeatherForMeasurement = useCallback(async (latitude: number, longitude: number, timestamp: Date): Promise<string | null> => {
    try {
      const weather = await fetchWeatherData({ latitude, longitude }, timestamp);
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