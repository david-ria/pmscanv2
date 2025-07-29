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

export function createMissionFromRecording(
  measurements: Array<{
    pmData: PMScanData;
    location?: LocationData;
    context?: {
      location: string;
      activity: string;
    };
    automaticContext?: string;
    weatherDataId?: string;
  }>,
  missionName: string,
  startTime: Date,
  endTime: Date,
  locationContext?: string,
  activityContext?: string,
  recordingFrequency?: string,
  shared?: boolean,
  missionId?: string
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

  const mission: MissionData = {
    id: missionId || crypto.randomUUID(),
    name: missionName,
    startTime,
    endTime,
    durationMinutes: Math.round(
      (endTime.getTime() - startTime.getTime()) / (1000 * 60)
    ),
    avgPm1,
    avgPm25,
    avgPm10,
    maxPm25,
    measurementsCount: measurementData.length,
    locationContext,
    activityContext,
    recordingFrequency: recordingFrequency || '30s',
    shared: shared || false,
    measurements: measurementData,
    synced: false,
    weatherDataId: missionWeatherDataId,
    airQualityDataId: undefined, // Will be added when mission is synced
  };

  return mission;
}

export function saveMissionLocally(mission: MissionData): void {
  try {
    const missions = getLocalMissions();
    const existingIndex = missions.findIndex((m) => m.id === mission.id);

    if (existingIndex >= 0) {
      missions[existingIndex] = mission;
    } else {
      missions.push(mission);
    }

    saveLocalMissions(missions);

    // Save any pending events for this mission
    savePendingEventsForMission(mission.id);

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

function savePendingEventsForMission(missionId: string): void {
  try {
    const pendingEvents = JSON.parse(localStorage.getItem('pending_events') || '[]');
    const eventsForMission = pendingEvents.filter((event: any) => event.mission_id === missionId);
    
    if (eventsForMission.length > 0) {
      // Store events for this mission separately
      const existingMissionEvents = JSON.parse(localStorage.getItem(`mission_events_${missionId}`) || '[]');
      const updatedEvents = [...existingMissionEvents, ...eventsForMission];
      localStorage.setItem(`mission_events_${missionId}`, JSON.stringify(updatedEvents));
      
      // Remove these events from pending
      const remainingPending = pendingEvents.filter((event: any) => event.mission_id !== missionId);
      localStorage.setItem('pending_events', JSON.stringify(remainingPending));
      
      console.log(`Saved ${eventsForMission.length} events for mission ${missionId}`);
    }
  } catch (error) {
    console.error('Failed to save pending events for mission:', error);
  }
}

export function updateMissionName(missionId: string, newName: string): void {
  try {
    const missions = getLocalMissions();
    const missionIndex = missions.findIndex((m) => m.id === missionId);
    
    if (missionIndex >= 0) {
      missions[missionIndex].name = newName;
      saveLocalMissions(missions);
      
      // Add to pending sync to update the database
      if (missions[missionIndex].synced) {
        missions[missionIndex].synced = false;
        addToPendingSync(missionId);
      }
    }
  } catch (error) {
    console.error('Failed to update mission name:', error);
    throw new Error('Impossible de mettre à jour le nom de la mission.');
  }
}

export async function deleteMission(missionId: string): Promise<void> {
  // Remove from local storage
  const missions = getLocalMissions().filter((m) => m.id !== missionId);
  saveLocalMissions(missions);
  removeFromPendingSync(missionId);

  // Try to delete from database if online
  if (navigator.onLine) {
    try {
      await supabase.from('missions').delete().eq('id', missionId);
    } catch (error) {
      console.error('Failed to delete mission from database:', error);
    }
  }
}
