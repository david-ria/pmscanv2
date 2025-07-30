import { useCallback } from 'react';
import { dataStorage } from '@/lib/dataStorage';
import { RecordingEntry } from '@/types/recording';
import * as logger from '@/utils/logger';

export function useMissionSaver() {
  const saveMission = useCallback(async (
    recordingData: RecordingEntry[],
    recordingStartTime: Date | null,
    missionName: string,
    locationContext?: string,
    activityContext?: string,
    recordingFrequency?: string,
    shared?: boolean,
    missionId?: string
  ) => {
    if (!recordingStartTime) {
      throw new Error('Aucun enregistrement en cours à sauvegarder');
    }

    if (recordingData.length === 0) {
      throw new Error('Aucune donnée enregistrée pour créer la mission');
    }

    // Calculate the actual start and end times from the recording data
    // recordingData is ordered with newest first, so we need to find the oldest entry for start time
    // and use the actual recording start time or the oldest data point
    const oldestDataPoint = recordingData[recordingData.length - 1];
    const newestDataPoint = recordingData[0];
    
    // Use the recording start time as the actual start time
    // This ensures we capture the full duration of the recording session
    const actualStartTime = recordingStartTime;
    
    // Use the newest data point timestamp as end time
    const endTime = newestDataPoint.timestamp;
    
    // Ensure minimum duration based on number of measurements
    // If we have many measurements but small time difference, extend the duration
    const calculatedDurationMs = endTime.getTime() - actualStartTime.getTime();
    const calculatedDurationMinutes = Math.round(calculatedDurationMs / (1000 * 60));
    
    // If duration is 0 but we have measurements, estimate based on measurement count
    let finalEndTime = endTime;
    if (calculatedDurationMinutes === 0 && recordingData.length > 1) {
      // Estimate 30 seconds per measurement on average as minimum
      const estimatedDurationMs = Math.max(
        calculatedDurationMs,
        (recordingData.length - 1) * 30 * 1000
      );
      finalEndTime = new Date(actualStartTime.getTime() + estimatedDurationMs);
    }
    
    // Debug logging for context flow
    console.log('🔍 Mission saving - context analysis:', {
      totalEntries: recordingData.length,
      missionContext: { locationContext, activityContext },
      contextDistribution: recordingData.reduce((acc, entry) => {
        const key = `${entry.context?.location || 'unknown'}-${entry.context?.activity || 'unknown'}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      sampleEntries: recordingData.slice(0, 3).map(entry => ({
        context: entry.context,
        automaticContext: entry.automaticContext
      }))
    });
    
    const mission = dataStorage.createMissionFromRecording(
      recordingData,
      missionName,
      actualStartTime,
      finalEndTime,
      locationContext,
      activityContext,
      recordingFrequency,
      shared,
      missionId
    );

    // Save mission locally so it appears in history
    dataStorage.saveMissionLocally(mission);

    // Export to CSV immediately
    await dataStorage.exportMissionToCSV(mission);

    logger.debug(
      '📁 Mission saved locally and exported to CSV. Will sync to database later.'
    );

    return mission;
  }, []);

  return {
    saveMission,
  };
}
