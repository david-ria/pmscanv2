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
      setWeatherData(null);
      return;
    }

    const fetchWeatherData = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('weather_data')
          .select('*')
          .eq('id', weatherDataId)
          .maybeSingle();

        if (error) {
          console.warn('Failed to fetch weather data:', error);
          setWeatherData(null);
        } else {
          setWeatherData(data);
        }
      } catch (error) {
        console.warn('Error fetching weather data:', error);
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