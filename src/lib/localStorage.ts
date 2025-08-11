import { MissionData } from './dataStorage';
import * as logger from '@/utils/logger';
import { getVersionedItem, setVersionedItem, removeVersionedItem, STORAGE_SCHEMAS, STORAGE_KEYS } from './versionedStorage';

// Legacy keys for migration
const LEGACY_MISSIONS_KEY = 'pmscan_missions';
const LEGACY_PENDING_SYNC_KEY = 'pmscan_pending_sync';

export function getLocalMissions(): MissionData[] {
  try {
    // Try versioned storage first
    const versionedMissions = getVersionedItem('MISSIONS', {
      schema: STORAGE_SCHEMAS.MISSIONS,
      migrationStrategy: 'migrate',
      migrator: (oldData: unknown, oldVersion: number) => {
        logger.info(`Migrating missions from version ${oldVersion} to current`);
        
        // Handle legacy format
        if (Array.isArray(oldData)) {
          return oldData.map((m: any) => ({
            ...m,
            startTime: new Date(m.startTime),
            endTime: new Date(m.endTime),
            measurements: m.measurements?.map((measurement: any) => ({
              ...measurement,
              timestamp: new Date(measurement.timestamp),
            })) || [],
          }));
        }
        
        return oldData as MissionData[];
      },
    });

    if (versionedMissions) {
      return versionedMissions;
    }

    // Fallback to legacy storage and migrate
    const stored = localStorage.getItem(LEGACY_MISSIONS_KEY);
    if (!stored) return [];

    const missions = JSON.parse(stored);
    const formatted = missions.map((m: Partial<MissionData> & { startTime: string; endTime: string; measurements: Array<{ timestamp: string }> }) => ({
      ...m,
      startTime: new Date(m.startTime),
      endTime: new Date(m.endTime),
      measurements: m.measurements.map((measurement: { timestamp: string; [key: string]: unknown }) => ({
        ...measurement,
        timestamp: new Date(measurement.timestamp),
      })),
    }));

    // Migrate to versioned storage and clean up legacy
    setVersionedItem('MISSIONS', formatted);
    localStorage.removeItem(LEGACY_MISSIONS_KEY);
    
    return formatted;
  } catch (error) {
    console.error('Error reading local missions:', error);
    return [];
  }
}

export function saveLocalMissions(missions: MissionData[]): void {
  try {
    setVersionedItem('MISSIONS', missions);
  } catch (quotaError) {
    if (
      quotaError instanceof DOMException &&
      quotaError.name === 'QuotaExceededError'
    ) {
      console.warn('LocalStorage quota exceeded, cleaning up old missions...');
      cleanupOldMissions(missions);
      // Try again after cleanup
      setVersionedItem('MISSIONS', missions);
    } else {
      throw quotaError;
    }
  }
}

export function formatDatabaseMission(dbMission: {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  avg_pm1: number;
  avg_pm25: number;
  avg_pm10: number;
  max_pm25: number;
  measurements_count: number;
  location_context?: string;
  activity_context?: string;
  recording_frequency?: string;
  shared?: boolean;
  weather_data_id?: string;
  air_quality_data_id?: string;
  measurements?: Array<{
    id: string;
    timestamp: string;
    pm1: number;
    pm25: number;
    pm10: number;
    temperature?: number;
    humidity?: number;
    latitude?: number;
    longitude?: number;
    accuracy?: number;
    location_context?: string;
    activity_context?: string;
    automatic_context?: string;
  }>;
}): MissionData {
  return {
    id: dbMission.id,
    name: dbMission.name,
    startTime: new Date(dbMission.start_time),
    endTime: new Date(dbMission.end_time),
    durationMinutes: dbMission.duration_minutes,
    avgPm1: dbMission.avg_pm1,
    avgPm25: dbMission.avg_pm25,
    avgPm10: dbMission.avg_pm10,
    maxPm25: dbMission.max_pm25,
    measurementsCount: dbMission.measurements_count,
    locationContext: dbMission.location_context,
    activityContext: dbMission.activity_context,
    recordingFrequency: dbMission.recording_frequency,
    shared: dbMission.shared,
    weatherDataId: dbMission.weather_data_id,
    airQualityDataId: dbMission.air_quality_data_id,
    measurements:
      dbMission.measurements?.map((m) => ({
        id: m.id,
        timestamp: new Date(m.timestamp),
        pm1: m.pm1,
        pm25: m.pm25,
        pm10: m.pm10,
        temperature: m.temperature,
        humidity: m.humidity,
        latitude: m.latitude,
        longitude: m.longitude,
        accuracy: m.accuracy,
        locationContext: m.location_context,
        activityContext: m.activity_context,
        automaticContext: m.automatic_context,
      })) || [],
    synced: true,
  };
}

export function getPendingSyncIds(): string[] {
  try {
    // Try versioned storage first
    const versionedPending = getVersionedItem('PENDING_SYNC', {
      schema: STORAGE_SCHEMAS.PENDING_SYNC,
      migrationStrategy: 'migrate',
      migrator: (oldData: unknown) => {
        if (Array.isArray(oldData)) {
          return oldData.filter((id): id is string => typeof id === 'string');
        }
        return [];
      },
    });

    if (versionedPending) {
      return versionedPending;
    }

    // Fallback to legacy storage
    const stored = localStorage.getItem(LEGACY_PENDING_SYNC_KEY);
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    
    // Migrate to versioned storage
    setVersionedItem('PENDING_SYNC', parsed);
    localStorage.removeItem(LEGACY_PENDING_SYNC_KEY);
    
    return parsed;
  } catch {
    return [];
  }
}

export function addToPendingSync(missionId: string): void {
  const pending = getPendingSyncIds();
  if (!pending.includes(missionId)) {
    pending.push(missionId);
    setVersionedItem('PENDING_SYNC', pending);
  }
}

export function removeFromPendingSync(missionId: string): void {
  const pending = getPendingSyncIds().filter((id) => id !== missionId);
  setVersionedItem('PENDING_SYNC', pending);
}

export function clearLocalStorage(): void {
  removeVersionedItem('MISSIONS');
  removeVersionedItem('PENDING_SYNC');
  
  // Also clean up legacy keys
  localStorage.removeItem(LEGACY_MISSIONS_KEY);
  localStorage.removeItem(LEGACY_PENDING_SYNC_KEY);
  
  logger.debug('Local storage cleared after CSV export');
}

export function cleanupOldMissions(missions: MissionData[]): void {
  // Keep only the most recent 10 missions to free up space
  const sortedMissions = missions.sort(
    (a, b) => b.endTime.getTime() - a.endTime.getTime()
  );
  const recentMissions = sortedMissions.slice(0, 10);

  logger.debug(
    `Cleaning up old missions, keeping ${recentMissions.length} most recent ones`
  );
  setVersionedItem('MISSIONS', recentMissions);

  // Update pending sync list to only include kept missions
  const keptMissionIds = recentMissions.map((m) => m.id);
  const updatedPending = getPendingSyncIds().filter((id) =>
    keptMissionIds.includes(id)
  );
  setVersionedItem('PENDING_SYNC', updatedPending);
}
