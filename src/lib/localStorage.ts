import { MissionData } from "./dataStorage";

const MISSIONS_KEY = 'pmscan_missions';
const PENDING_SYNC_KEY = 'pmscan_pending_sync';

export function getLocalMissions(): MissionData[] {
  try {
    const stored = localStorage.getItem(MISSIONS_KEY);
    if (!stored) return [];
    
    const missions = JSON.parse(stored);
    return missions.map((m: any) => ({
      ...m,
      startTime: new Date(m.startTime),
      endTime: new Date(m.endTime),
      measurements: m.measurements.map((measurement: any) => ({
        ...measurement,
        timestamp: new Date(measurement.timestamp)
      }))
    }));
  } catch (error) {
    console.error('Error reading local missions:', error);
    return [];
  }
}

export function saveLocalMissions(missions: MissionData[]): void {
  try {
    localStorage.setItem(MISSIONS_KEY, JSON.stringify(missions));
  } catch (quotaError) {
    if (quotaError instanceof DOMException && quotaError.name === 'QuotaExceededError') {
      console.warn('LocalStorage quota exceeded, cleaning up old missions...');
      cleanupOldMissions(missions);
      // Try again after cleanup
      localStorage.setItem(MISSIONS_KEY, JSON.stringify(missions));
    } else {
      throw quotaError;
    }
  }
}

export function formatDatabaseMission(dbMission: any): MissionData {
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
    measurements: dbMission.measurements?.map((m: any) => ({
      id: m.id,
      timestamp: new Date(m.timestamp),
      pm1: m.pm1,
      pm25: m.pm25,
      pm10: m.pm10,
      temperature: m.temperature,
      humidity: m.humidity,
      latitude: m.latitude,
      longitude: m.longitude,
      accuracy: m.accuracy
    })) || [],
    synced: true
  };
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
  const pending = getPendingSyncIds().filter(id => id !== missionId);
  localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(pending));
}

export function clearLocalStorage(): void {
  localStorage.removeItem(MISSIONS_KEY);
  localStorage.removeItem(PENDING_SYNC_KEY);
  console.log('Local storage cleared after CSV export');
}

export function cleanupOldMissions(missions: MissionData[]): void {
  // Keep only the most recent 10 missions to free up space
  const sortedMissions = missions.sort((a, b) => b.endTime.getTime() - a.endTime.getTime());
  const recentMissions = sortedMissions.slice(0, 10);
  
  console.log(`Cleaning up old missions, keeping ${recentMissions.length} most recent ones`);
  localStorage.setItem(MISSIONS_KEY, JSON.stringify(recentMissions));
  
  // Update pending sync list to only include kept missions
  const keptMissionIds = recentMissions.map(m => m.id);
  const updatedPending = getPendingSyncIds().filter(id => keptMissionIds.includes(id));
  localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(updatedPending));
}
