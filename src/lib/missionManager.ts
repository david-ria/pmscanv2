import { PMScanData } from '@/lib/pmscan/types';
import { LocationData } from '@/types/PMScan';
import { MissionData, MeasurementData } from './dataStorage';
import {
  getLocalMissions,
  saveLocalMissions,
  addToPendingSync,
  removeFromPendingSync,
} from './localStorage';
import { supabase } from '@/integrations/supabase/client';
import * as logger from '@/utils/logger';
import { parseFrequencyToMs } from './recordingUtils';

export function createMissionFromRecording(
  measurements: Array<{
    pmData: PMScanData;
    location?: LocationData;
    context?: {
      location: string;
      activity: string;
    };
    automaticContext?: string;
    enrichedLocation?: string;
    geohash?: string; // NEW: Geohash field
    weatherDataId?: string;
  }>,
  missionName: string,
  startTime: Date,
  endTime: Date,
  locationContext?: string,
  activityContext?: string,
  recordingFrequency?: string,
  shared?: boolean,
  missionId?: string,
  deviceName?: string
): MissionData {
  const measurementData: MeasurementData[] = measurements.map((m, index) => {
    return {
      id: crypto.randomUUID(),
      timestamp:
        m.pmData.timestamp instanceof Date
          ? m.pmData.timestamp
          : new Date(m.pmData.timestamp),
      pm1: m.pmData.pm1,
      pm25: m.pmData.pm25,
      pm10: m.pmData.pm10,
      temperature: m.pmData.temp,
      humidity: m.pmData.humidity,
      latitude: m.location?.latitude,
      longitude: m.location?.longitude,
      accuracy: m.location?.accuracy,
      // Individual measurement context takes precedence
      locationContext: m.context?.location,
      activityContext: m.context?.activity,
      automaticContext: m.automaticContext,
      enrichedLocation: m.enrichedLocation,
      geohash: m.geohash, // NEW: Include geohash in measurement conversion
    };
  });

  // Get weather data for the mission (use first measurement's weather data if available)
  const missionWeatherDataId = measurements.find(m => m.weatherDataId)?.weatherDataId;

  const pm25Values = measurementData.map((m) => m.pm25);
  const avgPm1 =
    measurementData.reduce((sum, m) => sum + m.pm1, 0) / measurementData.length;
  const avgPm25 =
    measurementData.reduce((sum, m) => sum + m.pm25, 0) /
    measurementData.length;
  const avgPm10 =
    measurementData.reduce((sum, m) => sum + m.pm10, 0) /
    measurementData.length;
  const maxPm25 = Math.max(...pm25Values);

  // Calculate gap detection and actual recording coverage
  const frequencyMs = parseFrequencyToMs(recordingFrequency || '30s');
  const totalDurationMinutes = Math.round(
    (endTime.getTime() - startTime.getTime()) / (1000 * 60)
  );
  const expectedMeasurements = Math.floor((totalDurationMinutes * 60 * 1000) / frequencyMs);
  const actualMeasurements = measurementData.length;
  
  // Calculate actual recording minutes based on measurement count and frequency
  const actualRecordingMinutes = Math.round((actualMeasurements * frequencyMs) / (1000 * 60));
  const recordingCoveragePercentage = expectedMeasurements > 0 ? 
    Math.round((actualMeasurements / expectedMeasurements) * 100) : 100;
  
  // Detect gaps by checking timestamp intervals
  let gapDetected = false;
  if (measurementData.length > 1) {
    const maxExpectedGap = frequencyMs * 2; // Allow up to 2x the recording frequency
    for (let i = 1; i < measurementData.length; i++) {
      const timeDiff = measurementData[i].timestamp.getTime() - measurementData[i-1].timestamp.getTime();
      if (timeDiff > maxExpectedGap) {
        gapDetected = true;
        break;
      }
    }
  }

  const mission: MissionData = {
    id: missionId || crypto.randomUUID(),
    name: missionName,
    startTime,
    endTime,
    durationMinutes: totalDurationMinutes,
    actualRecordingMinutes,
    recordingCoveragePercentage,
    gapDetected,
    avgPm1,
    avgPm25,
    avgPm10,
    maxPm25,
    measurementsCount: measurementData.length,
    locationContext,
    activityContext,
    recordingFrequency: recordingFrequency || '30s',
    shared: shared || false,
    deviceName,
    measurements: measurementData,
    synced: false,
    weatherDataId: missionWeatherDataId,
    airQualityDataId: undefined, // Will be added when mission is synced
  };

  return mission;
}

export function saveMissionLocally(mission: MissionData): void {
  logger.debug('💾 === SAVING MISSION LOCALLY ===');
  logger.debug('💾 Mission to save:', {
    id: mission.id,
    name: mission.name,
    measurementsCount: mission.measurementsCount,
    startTime: mission.startTime,
    endTime: mission.endTime
  });
  const existingMissions = getLocalMissions();
  logger.debug('💾 Existing missions count:', existingMissions.length);
  try {
    const missions = existingMissions;
    const existingIndex = missions.findIndex((m) => m.id === mission.id);

    if (existingIndex >= 0) {
      missions[existingIndex] = mission;
    } else {
      missions.push(mission);
    }

    saveLocalMissions(missions);
    logger.debug('✅ Mission saved locally successfully. Total missions now:', missions.length);

    // Save any pending events for this mission
    savePendingEventsForMission(mission.id, mission.startTime, mission.endTime);

    // Add to pending sync if not already synced
    if (!mission.synced) {
      addToPendingSync(mission.id);
    }
  } catch (error) {
    console.error('Failed to save mission locally:', error);
    throw new Error(
      'Impossible de sauvegarder la mission localement. Mémoire insuffisante.'
    );
  }
}

function savePendingEventsForMission(missionId: string, startTime: Date, endTime: Date): void {
  try {
    const pendingEvents = JSON.parse(localStorage.getItem('pending_events') || '[]');
    
    // Only process events marked as 'current-recording'
    const currentRecordingEvents = pendingEvents.filter((event: any) => 
      event.mission_id === 'current-recording'
    );
    
    logger.debug('📋 Processing pending events for mission:', {
      missionId,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      totalPending: pendingEvents.length,
      currentRecordingEvents: currentRecordingEvents.length
    });
    
    if (currentRecordingEvents.length > 0) {
      // Add 5-minute buffer on each side to account for timing variations
      const bufferMs = 5 * 60 * 1000;
      const missionStart = startTime.getTime() - bufferMs;
      const missionEnd = endTime.getTime() + bufferMs;
      
      // Filter events to only those within the mission timeframe
      const validEvents = currentRecordingEvents.filter((event: any) => {
        const eventTime = new Date(event.timestamp).getTime();
        const isValid = eventTime >= missionStart && eventTime <= missionEnd;
        
        if (!isValid) {
          logger.debug('⚠️ Event outside mission timeframe:', {
            eventTimestamp: event.timestamp,
            missionStart: startTime.toISOString(),
            missionEnd: endTime.toISOString()
          });
        }
        
        return isValid;
      });
      
      logger.debug('📋 Valid events after timestamp filtering:', validEvents.length);
      
      if (validEvents.length > 0) {
        // Update mission_id for valid events
        const updatedEvents = validEvents.map((event: any) => ({
          ...event,
          mission_id: missionId
        }));
        
        // Store events for this mission separately
        const existingMissionEvents = JSON.parse(localStorage.getItem(`mission_events_${missionId}`) || '[]');
        const allEvents = [...existingMissionEvents, ...updatedEvents];
        localStorage.setItem(`mission_events_${missionId}`, JSON.stringify(allEvents));
        
        // Remove processed events from pending
        const remainingPending = pendingEvents.filter((event: any) => 
          event.mission_id !== 'current-recording'
        );
        localStorage.setItem('pending_events', JSON.stringify(remainingPending));
        
        logger.debug(`✅ Saved ${validEvents.length} events for mission ${missionId}`);
      } else {
        logger.debug('⚠️ No valid events within mission timeframe');
      }
    }
  } catch (error) {
    console.error('Failed to save pending events for mission:', error);
  }
}

import { offlineAwareSupabase } from '@/lib/supabaseSafeWrapper';

export async function deleteMission(missionId: string): Promise<void> {
  // Remove from local storage
  const missions = getLocalMissions().filter((m) => m.id !== missionId);
  saveLocalMissions(missions);
  removeFromPendingSync(missionId);

  // Try to delete from database if online
  if (!offlineAwareSupabase.isOffline()) {
    const result = await offlineAwareSupabase.query(
      supabase.from('missions').delete().eq('id', missionId)
    );
    
    if (result.error && !result.isOffline) {
      console.error('Failed to delete mission from database:', result.error);
    }
  }
}
