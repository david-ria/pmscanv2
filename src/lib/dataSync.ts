import { invokeFunction } from '@/lib/api/client';
import { supabase } from '@/integrations/supabase/client';
import {
  getLocalMissions,
  getPendingSyncIds,
  removeFromPendingSync,
} from './localStorage';
import { saveMissionLocally } from './missionManager';
import { MissionData } from './dataStorage';
import * as logger from '@/utils/logger';

// Function to fetch weather data for a mission
async function fetchWeatherForMission(mission: MissionData): Promise<string | null> {
  try {
    // Get the first measurement with location data
    const measurementWithLocation = mission.measurements.find(
      m => m.latitude && m.longitude
    );

    if (!measurementWithLocation?.latitude || !measurementWithLocation?.longitude) {
      logger.debug('❌ Cannot fetch weather for mission: no location data');
      return null;
    }

    // Fetch weather data
    const result = await invokeFunction<{ weatherData: any }>('fetch-weather', {
      latitude: measurementWithLocation.latitude,
      longitude: measurementWithLocation.longitude,
      timestamp: mission.startTime.getTime(),
    });

    if (result?.weatherData) {
      logger.debug('✅ Weather data fetched for mission:', mission.id);
      return result.weatherData.id;
    }

    return null;
  } catch (error) {
    logger.error('❌ Error in weather fetch for mission:', error);
    return null;
  }
}

// Function to sync events for a mission
async function syncEventsForMission(missionId: string): Promise<void> {
  try {
    const missionEvents = JSON.parse(localStorage.getItem(`mission_events_${missionId}`) || '[]');
    
    if (missionEvents.length === 0) return;

    const currentUser = await supabase.auth.getUser();
    if (!currentUser.data.user) return;

    // Insert events into database using epoch ms timestamps
    const eventsToInsert = missionEvents.map((event: any) => ({
      id: event.id,
      mission_id: missionId,
      event_type: event.event_type,
      comment: event.comment,
      photo_url: event.photo_url,
      latitude: event.latitude,
      longitude: event.longitude,
      accuracy: event.accuracy,
      created_by: currentUser.data.user.id,
      timestamp_epoch_ms: event.timestamp instanceof Date ? event.timestamp.getTime() : Number(event.timestamp),
      timestamp: event.timestamp instanceof Date ? event.timestamp.toISOString() : new Date(event.timestamp).toISOString(), // Keep for compatibility
      date_utc: new Date(event.timestamp instanceof Date ? event.timestamp.getTime() : Number(event.timestamp)).toISOString().split('T')[0],
    }));

    const { error } = await supabase
      .from('events')
      .upsert(eventsToInsert);

    if (error) {
      logger.error(`❌ Error syncing events for mission ${missionId}:`, error);
      return;
    }

    // Clear local events for this mission after successful sync
    localStorage.removeItem(`mission_events_${missionId}`);
    logger.debug(`✅ Synced ${missionEvents.length} events for mission ${missionId}`);
  } catch (error) {
    logger.error(`❌ Error in syncEventsForMission for ${missionId}:`, error);
  }
}

// Function to fetch air quality data for a mission
async function fetchAirQualityForMission(mission: MissionData): Promise<string | null> {
  try {
    // Get the first measurement with location data
    const measurementWithLocation = mission.measurements.find(
      m => m.latitude && m.longitude
    );

    if (!measurementWithLocation?.latitude || !measurementWithLocation?.longitude) {
      logger.debug('❌ Cannot fetch air quality for mission: no location data');
      return null;
    }

    // Fetch air quality data
    const result = await invokeFunction<{ airQualityData: any }>('fetch-atmosud-data', {
      latitude: measurementWithLocation.latitude,
      longitude: measurementWithLocation.longitude,
      timestamp: mission.startTime.getTime(),
    });

    if (result?.airQualityData) {
      logger.debug('✅ Air quality data fetched for mission:', mission.id);
      return result.airQualityData.id;
    }

    return null;
  } catch (error) {
    logger.error('❌ Error in air quality fetch for mission:', error);
    return null;
  }
}

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
      // Fetch weather data for the mission if not already present
      let weatherDataId = mission.weatherDataId;
      if (!weatherDataId) {
        weatherDataId = await fetchWeatherForMission(mission);
      }

      // Fetch air quality data for the mission if not already present
      let airQualityDataId = mission.airQualityDataId;
      if (!airQualityDataId) {
        airQualityDataId = await fetchAirQualityForMission(mission);
      }

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
          user_id: (await supabase.auth.getUser()).data.user?.id,
          name: mission.name,
          start_epoch_ms: mission.startTime instanceof Date ? mission.startTime.getTime() : Number(mission.startTime),
          end_epoch_ms: mission.endTime instanceof Date ? mission.endTime.getTime() : Number(mission.endTime),
          start_time: mission.startTime instanceof Date ? mission.startTime.toISOString() : new Date(mission.startTime).toISOString(), // Keep for compatibility
          end_time: mission.endTime instanceof Date ? mission.endTime.toISOString() : new Date(mission.endTime).toISOString(), // Keep for compatibility
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
          weather_data_id: weatherDataId,
          air_quality_data_id: airQualityDataId,
        })
        .select()
        .single();

      if (missionError) throw missionError;

      // Save measurements to database using epoch ms timestamps as primary
      const measurementsToInsert = mission.measurements.map((m) => ({
        id: m.id,
        mission_id: mission.id,
        timestamp_epoch_ms: m.timestamp instanceof Date ? m.timestamp.getTime() : Number(m.timestamp),
        timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : new Date(m.timestamp).toISOString(), // Keep for compatibility
        pm1: m.pm1,
        pm25: m.pm25,
        pm10: m.pm10,
        temperature: m.temperature,
        humidity: m.humidity,
        latitude: m.latitude,
        longitude: m.longitude,
        accuracy: m.accuracy,
        location_context: m.locationContext,
        activity_context: m.activityContext,
        automatic_context: m.automaticContext,
        // Date field for querying (derived from epoch_ms)
        date_utc: new Date(m.timestamp instanceof Date ? m.timestamp.getTime() : Number(m.timestamp)).toISOString().split('T')[0],
      }));

      const { error: measurementsError } = await supabase
        .from('measurements')
        .upsert(measurementsToInsert);

      if (measurementsError) throw measurementsError;

      // Sync events for this mission
      await syncEventsForMission(mission.id);

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
