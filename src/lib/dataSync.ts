import { supabase } from '@/integrations/supabase/client';
import {
  getLocalMissions,
  getPendingSyncIds,
  removeFromPendingSync,
} from './localStorage';
import { saveMissionLocally } from './missionManager';
import * as logger from '@/utils/logger';

export async function syncPendingMissions(): Promise<void> {
  if (!navigator.onLine) return;

  const pendingIds = getPendingSyncIds();
  const localMissions = getLocalMissions();

  // Clean up any missions that don't exist locally but are still in pending sync
  const validPendingIds = pendingIds.filter((id) =>
    localMissions.some((mission) => mission.id === id)
  );

  // Remove invalid pending IDs
  const invalidIds = pendingIds.filter((id) => !validPendingIds.includes(id));
  invalidIds.forEach((id) => removeFromPendingSync(id));

  for (const missionId of validPendingIds) {
    const mission = localMissions.find((m) => m.id === missionId);
    if (!mission) continue;

    try {
      // Check if mission already exists first
      const { data: existingMission } = await supabase
        .from('missions')
        .select('id')
        .eq('id', mission.id)
        .single();

      // If mission already exists, skip syncing and mark as complete
      if (existingMission) {
        logger.debug(
          `Mission ${mission.name} already exists in database, skipping sync`
        );
        mission.synced = true;
        saveMissionLocally(mission);
        removeFromPendingSync(mission.id);
        continue;
      }

      // Save mission to database using upsert to handle edge cases
      const { data: savedMission, error: missionError } = await supabase
        .from('missions')
        .upsert({
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
          shared: mission.shared,
          weather_data_id: mission.weatherDataId,
        })
        .select()
        .single();

      if (missionError) throw missionError;

      // Save measurements to database using upsert to handle duplicates
      const measurementsToInsert = mission.measurements.map((m) => ({
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
        automatic_context: m.automaticContext,
        // weather_data_id removed - now at mission level
      }));

      const { error: measurementsError } = await supabase
        .from('measurements')
        .upsert(measurementsToInsert);

      if (measurementsError) throw measurementsError;

      // Mark as synced locally
      mission.synced = true;
      saveMissionLocally(mission);
      removeFromPendingSync(mission.id);

      logger.debug(`Mission ${mission.name} synced successfully`);
    } catch (error) {
      console.error(`Failed to sync mission ${mission.name}:`, error);
    }
  }
}
