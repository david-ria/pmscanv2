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
        console.log('🔄 Fetching weather for mission:', mission.id);
        const { data: weatherData, error: weatherError } = await supabase.functions.invoke('fetch-weather', {
          body: {
            latitude: measurementWithLocation.latitude,
            longitude: measurementWithLocation.longitude,
            timestamp: mission.startTime.toISOString(),
          },
        });

        if (!weatherError && weatherData?.weatherData) {
          result.weatherDataId = weatherData.weatherData.id;
          logger.debug('✅ Weather data fetched for mission:', mission.id, 'weatherId:', result.weatherDataId);
        } else {
          logger.error('❌ Failed to fetch weather data:', weatherError);
        }
      } else {
        console.log('ℹ️ Mission already has weather data:', mission.id);
      }


      // Update the mission in the database if we got new data
      if (result.weatherDataId) {
        console.log('💾 Updating mission in database:', mission.id, 'with weather ID:', result.weatherDataId);
        const { error: updateError } = await supabase
          .from('missions')
          .update({ weather_data_id: result.weatherDataId })
          .eq('id', mission.id);

        if (updateError) {
          console.error('❌ Database update failed:', updateError);
          logger.error('❌ Failed to update mission with enriched data:', updateError);
        } else {
          console.log('✅ Database update successful for mission:', mission.id);
          logger.debug('✅ Mission updated with enriched data:', mission.id);
        }
      } else {
        console.log('⚠️ No weather data to update for mission:', mission.id);
      }

    } catch (error) {
      logger.error('❌ Error enriching mission:', error);
    }

    return result;
  }, []);

  const enrichAllMissionsWithMissingData = useCallback(async () => {
    const BATCH_SIZE = 5;  // Process 5 missions at a time
    const DELAY_MS = 1000; // Wait 1s between batches to avoid rate limits
    
    try {
      // Get missions without weather data (limit to recent 20)
      const { data: missionsToEnrich, error } = await supabase
        .from('missions')
        .select('id, name, start_time, weather_data_id')
        .is('weather_data_id', null)
        .order('start_time', { ascending: false })
        .limit(20);

      if (error) {
        logger.error('❌ Error fetching missions to enrich:', error);
        return;
      }

      if (!missionsToEnrich?.length) {
        logger.debug('ℹ️ No missions found that need enrichment');
        return;
      }

      logger.debug(`📊 Found ${missionsToEnrich.length} missions to enrich`);

      // Check which missions have location data (in batch)
      const missionIds = missionsToEnrich.map(m => m.id);
      const { data: measurementsWithLocation } = await supabase
        .from('measurements')
        .select('mission_id, latitude, longitude')
        .in('mission_id', missionIds)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .limit(1); // Just need to know if they have location data

      if (!measurementsWithLocation?.length) {
        logger.debug('ℹ️ No missions with location data found');
        return;
      }

      // Build set of missions that have location data
      const missionsWithLocationIds = new Set(
        measurementsWithLocation.map(m => m.mission_id)
      );

      const missionsWithLocation = missionsToEnrich
        .filter(m => missionsWithLocationIds.has(m.id))
        .map(m => ({
          ...m,
          measurements: measurementsWithLocation.filter(ml => ml.mission_id === m.id)
        }));

      if (missionsWithLocation.length === 0) {
        logger.debug('ℹ️ No missions with location data found');
        return;
      }

      logger.debug(`🔄 Enriching ${missionsWithLocation.length} missions in batches of ${BATCH_SIZE}`);

      // Process in batches with throttling
      for (let i = 0; i < missionsWithLocation.length; i += BATCH_SIZE) {
        const batch = missionsWithLocation.slice(i, i + BATCH_SIZE);
        
        logger.debug(`📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(missionsWithLocation.length / BATCH_SIZE)}`);
        
        // Process batch in parallel
        await Promise.all(
          batch.map(mission => {
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
              
              return enrichMissionWithWeatherAndAirQuality(missionData as MissionData)
                .catch(error => {
                  logger.error(`❌ Error enriching mission ${mission.id}:`, error);
                });
            }
            return Promise.resolve();
          })
        );
        
        // Delay between batches (except for last batch)
        if (i + BATCH_SIZE < missionsWithLocation.length) {
          await new Promise(resolve => setTimeout(resolve, DELAY_MS));
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