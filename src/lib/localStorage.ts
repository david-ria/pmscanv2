import { MissionData, SensorType } from './dataStorage';
import * as logger from '@/utils/logger';

const MISSIONS_KEY = 'pmscan_missions';
const PENDING_SYNC_KEY = 'pmscan_pending_sync';
const AIRBEAM_MISSIONS_KEY = 'airbeam_missions';
const AIRBEAM_PENDING_SYNC_KEY = 'airbeam_pending_sync';

function getMissionsKey(sensorType: SensorType = 'pmscan'): string {
  return sensorType === 'airbeam' ? AIRBEAM_MISSIONS_KEY : MISSIONS_KEY;
}

function getPendingKey(sensorType: SensorType = 'pmscan'): string {
  return sensorType === 'airbeam' ? AIRBEAM_PENDING_SYNC_KEY : PENDING_SYNC_KEY;
}

export function getLocalMissions(sensorType: SensorType = 'pmscan'): MissionData[] {
  try {
    const stored = localStorage.getItem(getMissionsKey(sensorType));
    if (!stored) return [];

    const missions = JSON.parse(stored);
    return missions.map((m: Partial<MissionData> & { startTime: string; endTime: string; measurements: Array<{ timestamp: string }> }) => ({
      ...m,
      startTime: new Date(m.startTime),
      endTime: new Date(m.endTime),
      measurements: m.measurements.map((measurement: { timestamp: string; [key: string]: unknown }) => ({
        ...measurement,
        timestamp: new Date(measurement.timestamp),
      })),
    }));
  } catch (error) {
    console.error('Error reading local missions:', error);
    return [];
  }
}

export function saveLocalMissions(
  missions: MissionData[],
  sensorType: SensorType = 'pmscan'
): void {
  try {
    localStorage.setItem(getMissionsKey(sensorType), JSON.stringify(missions));
  } catch (quotaError) {
    if (
      quotaError instanceof DOMException &&
      quotaError.name === 'QuotaExceededError'
    ) {
      console.warn('LocalStorage quota exceeded, cleaning up old missions...');
      cleanupOldMissions(missions, sensorType);
      // Try again after cleanup
      localStorage.setItem(getMissionsKey(sensorType), JSON.stringify(missions));
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
        automaticContext: m.automatic_context,
      })) || [],
    synced: true,
  };
}

export function getPendingSyncIds(sensorType: SensorType = 'pmscan'): string[] {
  try {
    const stored = localStorage.getItem(getPendingKey(sensorType));
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addToPendingSync(
  missionId: string,
  sensorType: SensorType = 'pmscan'
): void {
  const pending = getPendingSyncIds(sensorType);
  if (!pending.includes(missionId)) {
    pending.push(missionId);
    localStorage.setItem(getPendingKey(sensorType), JSON.stringify(pending));
  }
}

export function removeFromPendingSync(
  missionId: string,
  sensorType: SensorType = 'pmscan'
): void {
  const pending = getPendingSyncIds(sensorType).filter((id) => id !== missionId);
  localStorage.setItem(getPendingKey(sensorType), JSON.stringify(pending));
}

export function clearLocalStorage(sensorType: SensorType = 'pmscan'): void {
  localStorage.removeItem(getMissionsKey(sensorType));
  localStorage.removeItem(getPendingKey(sensorType));
  logger.debug('Local storage cleared after CSV export');
}

export function cleanupOldMissions(
  missions: MissionData[],
  sensorType: SensorType = 'pmscan'
): void {
  // Keep only the most recent 10 missions to free up space
  const sortedMissions = missions.sort(
    (a, b) => b.endTime.getTime() - a.endTime.getTime()
  );
  const recentMissions = sortedMissions.slice(0, 10);

  logger.debug(
    `Cleaning up old missions, keeping ${recentMissions.length} most recent ones`
  );
  localStorage.setItem(
    getMissionsKey(sensorType),
    JSON.stringify(recentMissions)
  );

  // Update pending sync list to only include kept missions
  const keptMissionIds = recentMissions.map((m) => m.id);
  const updatedPending = getPendingSyncIds(sensorType).filter((id) =>
    keptMissionIds.includes(id)
  );
  localStorage.setItem(getPendingKey(sensorType), JSON.stringify(updatedPending));
}
