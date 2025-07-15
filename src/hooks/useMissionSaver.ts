import { useCallback } from 'react';
import { dataStorage } from '@/lib/dataStorage';
import { RecordingEntry } from '@/types/recording';
import * as logger from '@/utils/logger';

export function useMissionSaver() {
  const saveMission = useCallback((
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

    // Export to CSV immediately without storing locally first
    dataStorage.exportMissionToCSV(mission);

    // Skip database sync for now to prevent excessive syncing
    logger.debug(
      '📁 Mission exported to CSV - skipping database sync to reduce sync frequency'
    );

    return mission;
  }, []);

  return {
    saveMission,
  };
}
