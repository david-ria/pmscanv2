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
    console.log('💾 saveMission called with:', {
      recordingDataLength: recordingData.length,
      recordingStartTime,
      missionName,
      locationContext,
      activityContext,
      recordingFrequency,
      shared,
      missionId
    });

    if (!recordingStartTime) {
      console.error('❌ No recording start time:', recordingStartTime);
      throw new Error('Aucun enregistrement en cours à sauvegarder');
    }

    if (recordingData.length === 0) {
      console.error('❌ No recording data:', recordingData);
      throw new Error('Aucune donnée enregistrée pour créer la mission');
    }

    // Calculate the actual start and end times from the recording data
    // recordingData is ordered with newest first, so we need to find the oldest entry for start time
    // and use the actual recording start time or the oldest data point
    const oldestDataPoint = recordingData[recordingData.length - 1];
    const newestDataPoint = recordingData[0];
    
    // Use the earliest timestamp between recording start and oldest data point as start time
    const actualStartTime = recordingStartTime < oldestDataPoint.timestamp 
      ? recordingStartTime 
      : oldestDataPoint.timestamp;
    
    // Use the newest data point timestamp as end time
    const endTime = newestDataPoint.timestamp;
    
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
    
    try {
      console.log('📊 Creating mission from recording data...');
      const mission = dataStorage.createMissionFromRecording(
        recordingData,
        missionName,
        actualStartTime,
        endTime,
        locationContext,
        activityContext,
        recordingFrequency,
        shared,
        missionId
      );

      console.log('✅ Mission created successfully:', mission.id);

      // Save mission locally so it appears in history
      console.log('💾 Saving mission locally...');
      dataStorage.saveMissionLocally(mission);
      console.log('✅ Mission saved locally');

      // Export to CSV immediately
      console.log('📄 Exporting mission to CSV...');
      await dataStorage.exportMissionToCSV(mission);
      console.log('✅ Mission exported to CSV successfully');

      logger.debug(
        '📁 Mission saved locally and exported to CSV. Will sync to database later.'
      );

      return mission;
    } catch (error) {
      console.error('❌ Error in mission saving process:', error);
      console.error('❌ Error details:', {
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
        errorType: typeof error,
        errorValue: error
      });
      throw error; // Re-throw to let the calling code handle it
    }
  }, []);

  return {
    saveMission,
  };
}
