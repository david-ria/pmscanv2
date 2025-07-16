import { useCallback } from 'react';
import { dataStorage } from '@/lib/dataStorage';
import { RecordingEntry } from '@/types/recording';
import { useMissionAirQuality } from './useMissionAirQuality';
import { useAirQualityLogging } from './useAirQualityLogging';
import * as logger from '@/utils/logger';

export function useMissionSaver() {
  const { fetchAirQualityForMission } = useMissionAirQuality();
  const { isEnabled: airQualityLoggingEnabled } = useAirQualityLogging();
  
  const saveMission = useCallback(async (
    recordingData: RecordingEntry[],
    recordingStartTime: Date | null,
    missionName: string,
    locationContext?: string,
    activityContext?: string,
    recordingFrequency?: string,
    shared?: boolean
  ) => {
    if (!recordingStartTime) {
      throw new Error('Aucun enregistrement en cours à sauvegarder');
    }

    if (recordingData.length === 0) {
      throw new Error('Aucune donnée enregistrée pour créer la mission');
    }

    const endTime = new Date();
    const mission = dataStorage.createMissionFromRecording(
      recordingData,
      missionName,
      recordingStartTime,
      endTime,
      locationContext,
      activityContext,
      recordingFrequency,
      shared
    );

    // Save mission locally so it appears in history
    dataStorage.saveMissionLocally(mission);

    // Fetch air quality data if enabled and has location data
    if (airQualityLoggingEnabled && mission.measurements.some(m => m.latitude && m.longitude)) {
      try {
        logger.debug('🌬️ Fetching air quality data for mission:', mission.id);
        const airQualityId = await fetchAirQualityForMission(mission);
        if (airQualityId) {
          mission.airQualityDataId = airQualityId;
          // Update the saved mission with air quality data
          dataStorage.saveMissionLocally(mission);
          logger.debug('✅ Air quality data added to mission:', mission.id);
        }
      } catch (error) {
        logger.error('❌ Error fetching air quality for mission:', error);
        // Continue without air quality data
      }
    }

    // Export to CSV immediately
    dataStorage.exportMissionToCSV(mission);

    logger.debug(
      '📁 Mission saved locally and exported to CSV. Will sync to database later.'
    );

    return mission;
  }, [fetchAirQualityForMission, airQualityLoggingEnabled]);

  return {
    saveMission,
  };
}
