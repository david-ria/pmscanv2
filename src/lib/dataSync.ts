import { supabase } from "@/integrations/supabase/client";
import { getLocalMissions, getPendingSyncIds, removeFromPendingSync } from "./localStorage";
import { saveMissionLocally } from "./missionManager";

export async function syncPendingMissions(): Promise<void> {
  if (!navigator.onLine) return;

  const pendingIds = getPendingSyncIds();
  const localMissions = getLocalMissions();
  
  for (const missionId of pendingIds) {
    const mission = localMissions.find(m => m.id === missionId);
    if (!mission) continue;

    try {
      // Save mission to database
      const { data: savedMission, error: missionError } = await supabase
        .from('missions')
        .insert({
          id: mission.id,
          name: mission.name,
          start_time: mission.startTime.toISOString(),
          end_time: mission.endTime.toISOString(),
          duration_minutes: mission.durationMinutes,
          avg_pm1: mission.avgPm1,
          avg_pm25: mission.avgPm25,
          avg_pm10: mission.avgPm10,
          max_pm25: mission.maxPm25,
          measurements_count: mission.measurementsCount,
          location_context: mission.locationContext,
          activity_context: mission.activityContext,
          recording_frequency: mission.recordingFrequency,
          shared: mission.shared
        })
        .select()
        .single();

      if (missionError) throw missionError;

      // Save measurements to database
      const measurementsToInsert = mission.measurements.map(m => ({
        id: m.id,
        mission_id: mission.id,
        timestamp: m.timestamp.toISOString(),
        pm1: m.pm1,
        pm25: m.pm25,
        pm10: m.pm10,
        temperature: m.temperature,
        humidity: m.humidity,
        latitude: m.latitude,
        longitude: m.longitude,
        accuracy: m.accuracy,
        automatic_context: m.automaticContext
      }));

      const { error: measurementsError } = await supabase
        .from('measurements')
        .insert(measurementsToInsert);

      if (measurementsError) throw measurementsError;

      // Mark as synced locally
      mission.synced = true;
      saveMissionLocally(mission);
      removeFromPendingSync(mission.id);

      console.log(`Mission ${mission.name} synced successfully`);
    } catch (error) {
      console.error(`Failed to sync mission ${mission.name}:`, error);
    }
  }
}
