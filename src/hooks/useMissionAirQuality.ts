import { useCallback } from 'react';
import { useAirQualityData } from './useAirQualityData';
import { MissionData } from '@/lib/dataStorage';
import * as logger from '@/utils/logger';

export function useMissionAirQuality() {
  const { getAirQualityForMeasurement } = useAirQualityData();

  const fetchAirQualityForMission = useCallback(async (mission: MissionData): Promise<string | null> => {
    logger.debug('🌬️ Air quality fetch for mission disabled: AtmoSud integration removed', { missionId: mission.id });
    return null;
  }, []);

  return {
    fetchAirQualityForMission,
  };
}