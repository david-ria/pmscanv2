import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MissionData } from '@/lib/dataStorage';
import * as logger from '@/utils/logger';

export function useMissionEnrichment() {
  const enrichMissionWithWeatherAndAirQuality = useCallback(async (mission: MissionData): Promise<{
    weatherDataId?: string;
  }> => {
    const result: { weatherDataId?: string } = {};

    // Get the first measurement with location data
    const measurementWithLocation = mission.measurements.find(
      m => m.latitude && m.longitude
    );

    if (!measurementWithLocation?.latitude || !measurementWithLocation?.longitude) {
      logger.debug('❌ Cannot enrich mission: no location data');
      return result;
    }

    try {
      // Fetch weather data if not present
      if (!mission.weatherDataId) {
        const { data: weatherData, error: weatherError } = await supabase.functions.invoke('fetch-weather', {
          body: {
            latitude: measurementWithLocation.latitude,
            longitude: measurementWithLocation.longitude,
            timestamp: mission.startTime.toISOString(),
          },
        });

        if (!weatherError && weatherData?.weatherData) {
          result.weatherDataId = weatherData.weatherData.id;
          logger.debug('✅ Weather data fetched for mission:', mission.id);
        }
      }


      // Update the mission in the database if we got new data
      if (result.weatherDataId) {
        const { error: updateError } = await supabase
          .from('missions')
          .update({ weather_data_id: result.weatherDataId })
          .eq('id', mission.id);

        if (updateError) {
          logger.error('❌ Failed to update mission with enriched data:', updateError);
        } else {
          logger.debug('✅ Mission updated with enriched data:', mission.id);
        }
      }

    } catch (error) {
      logger.error('❌ Error enriching mission:', error);
    }

    return result;
  }, []);

  const enrichAllMissionsWithMissingData = useCallback(async () => {
    try {
      // Get all missions without weather data that have location measurements
      const { data: missionsToEnrich, error } = await supabase
        .from('missions')
        .select(`
          id, name, start_time, weather_data_id
        `)
        .is('weather_data_id', null)
        .limit(20); // Process in batches to avoid overwhelming the API

      if (error) {
        logger.error('❌ Error fetching missions to enrich:', error);
        return;
      }

      if (!missionsToEnrich?.length) {
        logger.debug('ℹ️ No missions found that need enrichment');
        return;
      }

      // Filter missions that have location data by checking measurements
      const missionsWithLocation = [];
      
      for (const mission of missionsToEnrich) {
        const { data: measurements } = await supabase
          .from('measurements')
          .select('latitude, longitude')
          .eq('mission_id', mission.id)
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)
          .limit(1);

        if (measurements?.length > 0) {
          missionsWithLocation.push({
            ...mission,
            measurements: measurements
          });
        }
      }

      if (missionsWithLocation.length === 0) {
        logger.debug('ℹ️ No missions found with location data that need enrichment');
        return;
      }

      logger.debug(`🔄 Enriching ${missionsWithLocation.length} missions...`);

      for (const mission of missionsWithLocation) {
        if (mission.measurements?.[0]) {
          const missionData: Partial<MissionData> = {
            id: mission.id,
            startTime: new Date(mission.start_time),
            weatherDataId: mission.weather_data_id,
            measurements: [{
              id: 'temp',
              timestamp: new Date(mission.start_time),
              pm1: 0,
              pm25: 0,
              pm10: 0,
              latitude: mission.measurements[0].latitude,
              longitude: mission.measurements[0].longitude,
            }]
          };

          await enrichMissionWithWeatherAndAirQuality(missionData as MissionData);
          
          // Add a small delay to avoid overwhelming the APIs
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      logger.debug('✅ Mission enrichment completed');
    } catch (error) {
      logger.error('❌ Error in batch mission enrichment:', error);
    }
  }, [enrichMissionWithWeatherAndAirQuality]);

  return {
    enrichMissionWithWeatherAndAirQuality,
    enrichAllMissionsWithMissingData,
  };
}