import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface WeatherData {
  temperature: number;
  humidity: number;
  pressure: number;
  weather_main: string;
  weather_description: string;
  wind_speed?: number;
  wind_direction?: number;
  visibility?: number;
  uv_index?: number;
  timestamp: string;
}

export function useWeatherDisplay(weatherDataId?: string) {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!weatherDataId) {
      console.log('🌤️ useWeatherDisplay - No weatherDataId, setting data to null');
      setWeatherData(null);
      return;
    }

    console.log('🌤️ useWeatherDisplay - Fetching weather data for ID:', weatherDataId);

    const fetchWeatherData = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('weather_data')
          .select('*')
          .eq('id', weatherDataId)
          .maybeSingle();

        if (error) {
          console.warn('🌤️ useWeatherDisplay - Failed to fetch weather data:', error);
          setWeatherData(null);
        } else {
          console.log('🌤️ useWeatherDisplay - Successfully fetched weather data:', data);
          setWeatherData(data);
        }
      } catch (error) {
        console.warn('🌤️ useWeatherDisplay - Error fetching weather data:', error);
        setWeatherData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchWeatherData();
  }, [weatherDataId]);

  // Format weather info for display
  const weatherSummary = weatherData ? 
    `${Math.round(weatherData.temperature)}°C, ${weatherData.weather_description}` : 
    null;

  return {
    weatherData,
    weatherSummary,
    loading,
  };
}