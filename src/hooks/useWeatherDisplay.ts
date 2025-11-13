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

// Cache global en dehors du hook
const weatherCache = new Map<string, { data: WeatherData | null; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useWeatherDisplay(weatherDataId?: string) {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!weatherDataId) {
      setWeatherData(null);
      return;
    }

    // Vérifier le cache en premier
    const cached = weatherCache.get(weatherDataId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setWeatherData(cached.data);
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

        const result = error ? null : data;
        setWeatherData(result);
        
        // Stocker dans le cache
        weatherCache.set(weatherDataId, {
          data: result,
          timestamp: Date.now()
        });
      } catch (error) {
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