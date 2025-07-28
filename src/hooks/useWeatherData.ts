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

    const requestId = `${location.latitude}_${location.longitude}_${timestamp?.getTime() || Date.now()}`;
    console.log(`[PERF] 🌤️ Weather request starting: ${requestId}`);
    
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
        console.log(`[PERF] ✅ Weather request completed: ${requestId}`);
        logger.debug('✅ Weather data fetched successfully:', data.weatherData.id);
        setWeatherData(data.weatherData);
        return data.weatherData;
      }

      console.log(`[PERF] ❌ Weather request failed - no data: ${requestId}`);
      return null;
    } catch (error) {
      console.log(`[PERF] ❌ Weather request error: ${requestId}`, error);
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