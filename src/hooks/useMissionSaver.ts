import { dataStorage } from '@/lib/dataStorage';
import { RecordingEntry } from '@/types/recording';

export function useMissionSaver() {
  const saveMission = (
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

    // Try to sync to database if online (but don't store locally)
    if (navigator.onLine) {
      // Create a temporary mission for database sync only
      try {
        dataStorage.saveMissionLocally(mission);
        dataStorage.syncPendingMissions().catch(console.error);
        // Clear storage immediately after sync attempt
        dataStorage.clearLocalStorage();
      } catch (storageError) {
        console.warn('Local storage failed, but CSV exported successfully');
      }
    }

    return mission;
  };

  return {
    saveMission,
  };
}
