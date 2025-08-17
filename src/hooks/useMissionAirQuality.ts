import { useCallback } from 'react';
import { useAirQualityData } from './useAirQualityData';
import { MissionData } from '@/lib/dataStorage';
import * as logger from '@/utils/logger';

export function useMissionAirQuality() {
  const { getAirQualityForMeasurement } = useAirQualityData();

  const fetchAirQualityForMission = useCallback(async (mission: MissionData): Promise<string | null> => {
    logger.debug('Air quality data functionality has been removed');
    return null;
  }, []);

  return {
    fetchAirQualityForMission,
  };
}