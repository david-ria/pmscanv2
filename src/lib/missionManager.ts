import { SensorReadingData as PMScanData } from '@/types/sensor';
import { LocationData } from '@/types/PMScan';
import { MissionData, MeasurementData } from './dataStorage';
import { supabase } from '@/integrations/supabase/client';
import * as logger from '@/utils/logger';
import { parseFrequencyToMs } from './recordingUtils';
import { STORAGE_KEYS } from '@/services/storageService';

// Storage keys for missions
const MISSIONS_KEY = STORAGE_KEYS.MISSIONS;
const PENDING_SYNC_KEY = STORAGE_KEYS.PENDING_SYNC;

// ==========================================
// LOCAL STORAGE FUNCTIONS (migrated from localStorage.ts)
// ==========================================

export function getLocalMissions(): MissionData[] {
  try {
    const stored = localStorage.getItem(MISSIONS_KEY);
    if (!stored) return [];

    const missions = JSON.parse(stored);
    const validMissions: MissionData[] = [];
    const orphanedCount = missions.filter((m: Partial<MissionData> & { measurements: unknown[] }) => {
      const hasOrphanedData = m.measurementsCount && m.measurementsCount > 0 && (!m.measurements || m.measurements.length === 0);
      return hasOrphanedData;
    }).length;
    
    if (orphanedCount > 0) {
      logger.warn(`🗑️ Found ${orphanedCount} orphaned mission(s) in localStorage, removing...`);
    }
    
    for (const m of missions) {
      const mission = m as Partial<MissionData> & { startTime: string; endTime: string; measurements: Array<{ timestamp: string }> };
      // Skip orphaned missions (have metadata but no measurements)
      const hasOrphanedData = mission.measurementsCount && mission.measurementsCount > 0 && (!mission.measurements || mission.measurements.length === 0);
      if (hasOrphanedData) {
        logger.debug(`🗑️ Removing orphaned mission: ${mission.name}`);
        continue;
      }
      
      validMissions.push({
        ...mission,
        startTime: new Date(mission.startTime),
        endTime: new Date(mission.endTime),
        measurements: (mission.measurements || []).map((measurement: any) => ({
          ...measurement,
          timestamp: new Date(measurement.timestamp),
        })),
      } as MissionData);
    }
    
    // Save cleaned missions back to localStorage if any were removed
    if (orphanedCount > 0) {
      localStorage.setItem(MISSIONS_KEY, JSON.stringify(validMissions));
      logger.debug(`✅ Cleaned up ${orphanedCount} orphaned mission(s) from localStorage`);
    }
    
    return validMissions;
  } catch (error) {
    console.error('Error reading local missions:', error);
    return [];
  }
}

export function saveLocalMissions(missions: MissionData[]): void {
  logger.debug('💾 === SAVING LOCAL MISSIONS ===');
  logger.debug('💾 Number of missions to save:', missions.length);
  logger.debug('💾 Mission names:', missions.map(m => m.name));
  try {
    localStorage.setItem(MISSIONS_KEY, JSON.stringify(missions));
    logger.debug('✅ Missions saved to localStorage successfully');
  } catch (quotaError) {
    if (
      quotaError instanceof DOMException &&
      quotaError.name === 'QuotaExceededError'
    ) {
      console.warn('LocalStorage quota exceeded, cleaning up old missions...');
      cleanupOldMissions(missions);
      // Try again after cleanup
      localStorage.setItem(MISSIONS_KEY, JSON.stringify(missions));
    } else {
      throw quotaError;
    }
  }
}

export function getPendingSyncIds(): string[] {
  try {
    const stored = localStorage.getItem(PENDING_SYNC_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addToPendingSync(missionId: string): void {
  const pending = getPendingSyncIds();
  if (!pending.includes(missionId)) {
    pending.push(missionId);
    localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(pending));
  }
}

export function removeFromPendingSync(missionId: string): void {
  const pending = getPendingSyncIds().filter((id) => id !== missionId);
  localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(pending));
}

export function clearMissionStorage(): void {
  localStorage.removeItem(MISSIONS_KEY);
  localStorage.removeItem(PENDING_SYNC_KEY);
  logger.debug('Mission storage cleared');
}

export function cleanupOldMissions(missions: MissionData[]): void {
  // Keep only the most recent 5 missions to free up space
  const sortedMissions = missions.sort(
    (a, b) => b.endTime.getTime() - a.endTime.getTime()
  );
  const recentMissions = sortedMissions.slice(0, 5);

  logger.debug(
    `Cleaning up old missions, keeping ${recentMissions.length} most recent ones`
  );
  
  // Strip measurements from missions being kept to save even more space
  const strippedMissions = recentMissions.map(mission => ({
    ...mission,
    measurements: mission.measurements.length > 2 
      ? [mission.measurements[0], mission.measurements[mission.measurements.length - 1]]
      : mission.measurements
  }));
  
  localStorage.setItem(MISSIONS_KEY, JSON.stringify(strippedMissions));

  // Update pending sync list to only include kept missions
  const keptMissionIds = recentMissions.map((m) => m.id);
  const updatedPending = getPendingSyncIds().filter((id) =>
    keptMissionIds.includes(id)
  );
  localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(updatedPending));
}

// ==========================================
// MISSION CREATION AND MANAGEMENT
// ==========================================

export function createMissionFromRecording(
  measurements: Array<{
    pmData: PMScanData;
    location?: LocationData;
    manualContext?: {
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
  recordingFrequency?: string,
  shared?: boolean,
  missionId?: string,
  deviceName?: string,
  groupId?: string
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
      pressure: m.pmData.pressure, // Atmotube Pro: atmospheric pressure in hPa
      tvoc: m.pmData.tvoc, // Atmotube Pro: TVOC in ppb
      latitude: m.location?.latitude,
      longitude: m.location?.longitude,
      accuracy: m.location?.accuracy,
      // Individual measurement context takes precedence
      locationContext: m.manualContext?.location,
      activityContext: m.manualContext?.activity,
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
    recordingFrequency: recordingFrequency || '30s',
    shared: shared || false,
    groupId: groupId,
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

/**
 * Strips detailed measurements from a mission in localStorage to save space
 * Keeps aggregated data and mission metadata intact
 */
export function stripMeasurementsFromStorage(missionId: string): void {
  try {
    const missions = getLocalMissions();
    const missionIndex = missions.findIndex(m => m.id === missionId);
    
    if (missionIndex >= 0) {
      const mission = missions[missionIndex];
      const originalSize = mission.measurements.length;
      
      // If 10 or fewer measurements, keep all for accurate offline display
      if (originalSize <= 10) {
        logger.debug(`💾 Mission ${mission.name} has ${originalSize} measurements - keeping all`);
        return;
      }
      
      // Intelligent compression: keep ~10% of measurements
      const compressed = [
        mission.measurements[0],     // First
        mission.measurements[1],     // Second
      ];
      
      // Keep 1 point every 10 between extremes
      for (let i = 2; i < originalSize - 2; i += 10) {
        compressed.push(mission.measurements[i]);
      }
      
      compressed.push(
        mission.measurements[originalSize - 2], // Second to last
        mission.measurements[originalSize - 1]  // Last
      );
      
      mission.measurements = compressed;
      
      logger.debug(`💾 Compressed measurements for ${mission.name}: ${originalSize} → ${compressed.length} (${Math.round(compressed.length/originalSize*100)}%)`);
      
      saveLocalMissions(missions);
    }
  } catch (error) {
    logger.error('Failed to strip measurements:', error);
    // Non-critical error, don't throw
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
