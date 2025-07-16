import { useCallback } from 'react';
import { useAirQualityData } from './useAirQualityData';
import { MissionData } from '@/lib/dataStorage';
import * as logger from '@/utils/logger';

export function useMissionAirQuality() {
  const { getAirQualityForMeasurement } = useAirQualityData();

  const fetchAirQualityForMission = useCallback(async (mission: MissionData): Promise<string | null> => {
    try {
      // Get the first measurement with location data
      const measurementWithLocation = mission.measurements.find(
        m => m.latitude && m.longitude
      );

      if (!measurementWithLocation?.latitude || !measurementWithLocation?.longitude) {
        logger.debug('❌ Cannot fetch air quality for mission: no location data');
        return null;
      }

      // Use the mission start time for the air quality data request
      const airQualityId = await getAirQualityForMeasurement(
        measurementWithLocation.latitude,
        measurementWithLocation.longitude,
        mission.startTime
      );

      if (airQualityId) {
        logger.debug('✅ Air quality data fetched for mission:', mission.id);
      }

      return airQualityId;
    } catch (error) {
      logger.error('❌ Error fetching air quality for mission:', error);
      return null;
    }
  }, [getAirQualityForMeasurement]);

  return {
    fetchAirQualityForMission,
  };
}