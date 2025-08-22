import { supabase } from '@/integrations/supabase/client';
import {
  getLocalMissions,
  getPendingSyncIds,
  removeFromPendingSync,
} from './localStorage';
import { saveMissionLocally } from './missionManager';
import { MissionData } from './dataStorage';
import * as logger from '@/utils/logger';
import { toISOString } from '@/utils/timeFormat';

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
    const { data, error } = await supabase.functions.invoke('fetch-weather', {
      body: {
        latitude: measurementWithLocation.latitude,
        longitude: measurementWithLocation.longitude,
        timestamp: toISOString(mission.startTime),
      },
    });

    if (error) {
      logger.error('❌ Error fetching weather data for mission:', error);
      return null;
    }

    if (data?.weatherData) {
      logger.debug('✅ Weather data fetched for mission:', mission.id);
      return data.weatherData.id;
    }

    return null;
  } catch (error) {
    logger.error('❌ Error in weather fetch for mission:', error);
    return null;
  }
}

// Function to sync events for a mission
async function syncEventsForMission(missionId: string): Promise<boolean> {
  try {
    const missionEvents = JSON.parse(localStorage.getItem(`mission_events_${missionId}`) || '[]');
    
    if (missionEvents.length === 0) return true;

    const currentUser = await supabase.auth.getUser();
    if (!currentUser.data.user) return false;

    // Insert events into database
    const eventsToInsert = missionEvents.map((event: { event_type: string; timestamp: Date; id: string; user_id: string; [key: string]: unknown }) => ({
      id: event.id,
      mission_id: missionId,
      event_type: event.event_type,
      comment: event.comment,
      photo_url: event.photo_url,
      latitude: event.latitude,
      longitude: event.longitude,
      accuracy: event.accuracy,
      created_by: currentUser.data.user.id,
      timestamp: event.timestamp,
    }));

    const { error } = await supabase
      .from('events')
      .upsert(eventsToInsert);

    if (error) {
      logger.error(`❌ Error syncing events for mission ${missionId}:`, error);
      return false;
    }

    // Clear local events for this mission after successful sync
    localStorage.removeItem(`mission_events_${missionId}`);
    logger.debug(`✅ Synced ${missionEvents.length} events for mission ${missionId}`);
    return true;
  } catch (error) {
    logger.error(`❌ Error in syncEventsForMission for ${missionId}:`, error);
    return false;
  }
}

// Function to validate sync by checking measurement count
async function validateMissionSync(missionId: string, expectedCount: number): Promise<boolean> {
  try {
    const { count, error } = await supabase
      .from('measurements')
      .select('*', { count: 'exact', head: true })
      .eq('mission_id', missionId);

    if (error) {
      logger.error(`❌ Error validating sync for mission ${missionId}:`, error);
      return false;
    }

    const synced = count === expectedCount;
    if (!synced) {
      logger.error(`❌ Sync validation failed for mission ${missionId}: expected ${expectedCount}, got ${count}`);
    } else {
      logger.debug(`✅ Sync validation passed for mission ${missionId}: ${count} measurements`);
    }
    
    return synced;
  } catch (error) {
    logger.error(`❌ Error in validateMissionSync for ${missionId}:`, error);
    return false;
  }
}

// Air quality data functionality has been removed
async function fetchAirQualityForMission(mission: MissionData): Promise<string | null> {
  logger.debug('Air quality data functionality has been removed');
  return null;
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

    let syncSuccess = false;
    let retryCount = 0;
    const maxRetries = 3;

    while (!syncSuccess && retryCount < maxRetries) {
      try {
        retryCount++;
        logger.debug(`🔄 Syncing mission ${mission.name} (attempt ${retryCount}/${maxRetries})`);

        // Fetch weather data for the mission if not already present
        let weatherDataId = mission.weatherDataId;
        if (!weatherDataId) {
          weatherDataId = await fetchWeatherForMission(mission);
        }

        // Air quality data functionality has been removed
        const airQualityDataId = null;

        // Check if mission already exists and validate its data integrity
        const { data: existingMission } = await supabase
          .from('missions')
          .select('id')
          .eq('id', mission.id)
          .maybeSingle();

        // If mission exists, validate sync integrity
        if (existingMission) {
          const isValidSync = await validateMissionSync(mission.id, mission.measurementsCount);
          if (isValidSync) {
            logger.debug(`✅ Mission ${mission.name} already properly synced`);
            mission.synced = true;
            saveMissionLocally(mission);
            removeFromPendingSync(mission.id);
            syncSuccess = true;
            continue;
          } else {
            logger.debug(`🔄 Mission ${mission.name} exists but sync incomplete, re-syncing measurements`);
          }
        }

        // Save mission to database using upsert to handle edge cases
        const { data: savedMission, error: missionError } = await supabase
          .from('missions')
          .upsert({
            id: mission.id,
            user_id: (await supabase.auth.getUser()).data.user?.id,
            name: mission.name,
            start_time: toISOString(mission.startTime),
            end_time: toISOString(mission.endTime),
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
            device_name: mission.deviceName,
            weather_data_id: weatherDataId,
            air_quality_data_id: airQualityDataId,
          })
          .select()
          .single();

        if (missionError) throw missionError;

        // Save measurements to database using upsert to handle duplicates
        const measurementsToInsert = mission.measurements.map((m) => ({
          id: m.id,
          mission_id: mission.id,
          timestamp: toISOString(m.timestamp),
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
          enriched_location: m.enrichedLocation,
          geohash: m.geohash, // NEW: Include geohash in sync
        }));

        const { error: measurementsError } = await supabase
          .from('measurements')
          .upsert(measurementsToInsert);

        if (measurementsError) throw measurementsError;

        // Sync events for this mission
        const eventsSuccess = await syncEventsForMission(mission.id);
        if (!eventsSuccess) throw new Error('Failed to sync events');

        // Validate that all data was synced correctly
        const isValidSync = await validateMissionSync(mission.id, mission.measurementsCount);
        if (!isValidSync) throw new Error('Sync validation failed');

        // Mark as synced locally only after successful validation
        mission.synced = true;
        saveMissionLocally(mission);
        removeFromPendingSync(mission.id);
        syncSuccess = true;

        logger.debug(`✅ Mission ${mission.name} synced successfully`);
      } catch (error) {
        logger.error(`❌ Failed to sync mission ${mission.name} (attempt ${retryCount}):`, error);
        
        if (retryCount >= maxRetries) {
          logger.error(`❌ Mission ${mission.name} failed to sync after ${maxRetries} attempts`);
          // TODO: Mark mission with failed sync status for manual retry
        } else {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
    }
  }
}
