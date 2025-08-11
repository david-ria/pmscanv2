import { useState, useCallback } from 'react';
import { invokeFunction } from '@/lib/api/client';
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
    // Weather fetching temporarily disabled to prevent CORS spam
    logger.debug('🌐 Weather fetching temporarily disabled');
    return null;
    
    // Commented out to prevent CORS spam
    /*
    if (!location?.latitude || !location?.longitude) {
      logger.debug('❌ Cannot fetch weather data: missing location');
      return null;
    }
      logger.debug('❌ Cannot fetch weather data: missing location');
      return null;
    }

    setIsLoading(true);
    
    try {
      logger.debug('🌤️ Fetching weather data for location:', location);
      
      const result = await invokeFunction<{ weatherData: WeatherData }>('fetch-weather', {
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: timestamp ? timestamp.getTime() : Date.now(),
      });

      if (result?.weatherData) {
        logger.debug('✅ Weather data fetched successfully:', result.weatherData.id);
        setWeatherData(result.weatherData);
        return result.weatherData;
      }

      return null;
    } catch (error: any) {
      // Handle CORS and network errors more gracefully
      if (error?.message?.includes('CORS') || error?.message?.includes('NetworkError')) {
        logger.debug('🌐 Weather fetch blocked by CORS policy - skipping');
      } else {
        logger.error('❌ Error in weather data fetch:', error);
      }
      return null;
    } finally {
      setIsLoading(false);
    }
    */
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