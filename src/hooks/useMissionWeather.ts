import { useCallback } from 'react';
import { useWeatherData } from './useWeatherData';
import { MissionData } from '@/lib/dataStorage';
import * as logger from '@/utils/logger';

export function useMissionWeather() {
  const { getWeatherForMeasurement } = useWeatherData();

  const fetchWeatherForMission = useCallback(async (mission: MissionData): Promise<string | null> => {
    try {
      // Get the first measurement with location data
      const measurementWithLocation = mission.measurements.find(
        m => m.latitude && m.longitude
      );

      if (!measurementWithLocation?.latitude || !measurementWithLocation?.longitude) {
        logger.debug('❌ Cannot fetch weather for mission: no location data');
        return null;
      }

      // Use the mission start time for the weather data request
      const weatherId = await getWeatherForMeasurement(
        measurementWithLocation.latitude,
        measurementWithLocation.longitude,
        mission.startTime
      );

      if (weatherId) {
        logger.debug('✅ Weather data fetched for mission:', mission.id);
      }

      return weatherId;
    } catch (error) {
      logger.error('❌ Error fetching weather for mission:', error);
      return null;
    }
  }, [getWeatherForMeasurement]);

  return {
    fetchWeatherForMission,
  };
}