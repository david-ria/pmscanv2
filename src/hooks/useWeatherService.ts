import { useState, useCallback } from 'react';
import { weatherService, WeatherData } from '@/services/weatherService';
import { LocationData } from '@/types/PMScan';
import { MissionData } from '@/lib/dataStorage';

export function useWeatherService() {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchWeatherForLocation = useCallback(async (
    location: LocationData, 
    timestamp?: Date
  ): Promise<WeatherData | null> => {
    setIsLoading(true);
    try {
      const weather = await weatherService.getWeatherForLocation(location, timestamp);
      setWeatherData(weather);
      return weather;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getWeatherIdForMeasurement = useCallback(async (
    latitude: number,
    longitude: number,
    timestamp?: Date
  ): Promise<string | null> => {
    try {
      const weather = await weatherService.fetchWeatherData({
        latitude,
        longitude,
        timestamp
      });
      return weather?.id || null;
    } catch (error) {
      return null;
    }
  }, []);

  const enrichMissionWithWeather = useCallback(async (
    mission: MissionData
  ): Promise<{ weatherDataId?: string }> => {
    return weatherService.enrichMissionWithWeather(mission);
  }, []);

  const batchEnrichMissions = useCallback(async (limit?: number) => {
    return weatherService.batchEnrichMissions(limit);
  }, []);

  return {
    weatherData,
    isLoading,
    fetchWeatherForLocation,
    getWeatherIdForMeasurement,
    enrichMissionWithWeather,
    batchEnrichMissions,
  };
}