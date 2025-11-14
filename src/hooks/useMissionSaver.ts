import { useCallback } from 'react';
import { dataStorage } from '@/lib/dataStorage';
import { RecordingEntry } from '@/types/recording';
import { createTimestamp } from '@/utils/timeFormat';
import * as logger from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';

export function useMissionSaver() {
  
  const saveMission = useCallback(async (
    recordingData: RecordingEntry[],
    recordingStartTime: Date | null,
    missionName: string,
    recordingFrequency?: string,
    shared?: boolean,
    missionId?: string,
    deviceName?: string,
    groupId?: string
  ) => {
    console.log('🚨💾 === MISSION SAVER CALLED ===');
    console.log('💾 useMissionSaver.saveMission called with:', {
      recordingDataLength: recordingData?.length || 0,
      recordingStartTime,
      missionName,
      recordingFrequency,
      shared,
      deviceName: deviceName,
      groupId: groupId,
      hasRecordingData: !!recordingData,
      sampleDataPoints: recordingData?.slice(0, 2).map(entry => ({
        pm25: entry.pmData.pm25,
        timestamp: entry.timestamp,
        manualContext: entry.manualContext
      }))
    });
    logger.debug('💾 useMissionSaver.saveMission called with:', {
      recordingDataLength: recordingData?.length || 0,
      recordingStartTime,
      missionName,
      recordingFrequency,
      shared
    });

    if (!recordingStartTime) {
      logger.error('❌ No recording start time provided');
      throw new Error('Aucun enregistrement en cours à sauvegarder');
    }

    if (recordingData.length === 0) {
      logger.error('❌ No recording data provided');
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
    
    // Use the newest data point timestamp as end time, but ensure minimum duration
    let endTime = newestDataPoint.timestamp;
    
    // If duration would be 0 or very small, use current time as end time to reflect actual recording session
    const durationMs = endTime.getTime() - actualStartTime.getTime();
    const durationMinutes = Math.round(durationMs / (1000 * 60));
    
    if (durationMinutes < 1) {
      // Use unified timestamp creation for consistency
      endTime = createTimestamp();
      logger.debug('📏 Adjusting mission end time due to minimal data duration:', {
        originalDuration: durationMinutes,
        adjustedEndTime: endTime,
        recordingStartTime: actualStartTime
      });
    }
    
    // Debug logging for context flow (context is at measurement level)
    console.log('🔍 Mission saving - context analysis:', {
      totalEntries: recordingData.length,
      contextDistribution: recordingData.reduce((acc, entry) => {
        const key = `${entry.manualContext?.location || 'unknown'}-${entry.manualContext?.activity || 'unknown'}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      sampleEntries: recordingData.slice(0, 3).map(entry => ({
        manualContext: entry.manualContext,
        automaticContext: entry.automaticContext
      }))
    });
    
    logger.debug('💾 About to create mission from recording data');
      const mission = dataStorage.createMissionFromRecording(
        recordingData,
        missionName,
        actualStartTime,
        endTime,
        recordingFrequency,
        shared,
        missionId,
        deviceName,
        groupId
      );
    
    // Enrich with weather data immediately if online
    if (navigator.onLine) {
      const measurementWithLocation = recordingData.find(
        m => m.location?.latitude && m.location?.longitude
      );
      
      if (measurementWithLocation?.location) {
        try {
          logger.debug('🌤️ Fetching weather data for mission...');
          const { data, error } = await supabase.functions.invoke('fetch-weather', {
            body: {
              latitude: measurementWithLocation.location.latitude,
              longitude: measurementWithLocation.location.longitude,
              timestamp: actualStartTime.toISOString(),
            },
          });
          
          if (!error && data?.weatherData?.id) {
            mission.weatherDataId = data.weatherData.id;
            logger.debug('✅ Weather data fetched:', data.weatherData.id);
          } else {
            logger.warn('⚠️ Weather fetch failed, will retry during sync');
          }
        } catch (error) {
          logger.warn('⚠️ Weather API error:', error);
        }
      }
    }

    logger.debug('💾 Mission created:', {
      id: mission.id,
      name: mission.name,
      measurementsCount: mission.measurementsCount
    });

    // Save mission locally so it appears in history
    logger.debug('💾 Saving mission locally...');
    dataStorage.saveMissionLocally(mission);

    // Export to CSV immediately
    logger.debug('💾 Exporting mission to CSV...');
    console.log('🚨💾 === ABOUT TO EXPORT CSV ===');
    console.log('💾 Mission data for CSV export:', {
      missionId: mission.id,
      measurementsCount: mission.measurementsCount,
      missionName: mission.name
    });
    
    try {
      await dataStorage.exportMissionToCSV(mission);
      console.log('🚨💾 === CSV EXPORT SUCCESS ===');
      
      // NOTE: Measurements are NOT stripped here anymore
      // They will be stripped after successful database sync in dataSync.ts
      // This ensures full data is available for sync to database
      
    } catch (csvError) {
      console.error('🚨💾 === CSV EXPORT FAILED ===', csvError);
      throw csvError;
    }

    logger.debug(
      '📁 Mission saved locally and exported to CSV.'
    );
    console.log('🚨💾 === MISSION SAVE COMPLETE ===');

    // Trigger silent auto-sync if online
    if (navigator.onLine) {
      console.log('🔄 Triggering auto-sync for newly saved mission...');
      // Don't await - let it happen in background
      dataStorage.syncPendingMissions().then(() => {
        console.log('✅ Auto-sync completed for new mission');
      }).catch((error) => {
        console.error('⚠️ Auto-sync failed (will retry on reconnect):', error);
      });
    }

    return mission;
  }, []);

  return {
    saveMission,
  };
}
