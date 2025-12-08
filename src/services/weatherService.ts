import { supabase } from '@/integrations/supabase/client';
import { LocationData } from '@/types/PMScan';
import { MissionData } from '@/lib/dataStorage';
import * as logger from '@/utils/logger';
import { createEpochMs, type EpochMs } from '@/utils/timestamp';

export interface WeatherData {
  id: string;
  temperature: number;
  humidity: number;
  pressure: number;
  weather_main: string;
  weather_description: string;
  wind_speed?: number;
  wind_direction?: number;
  uv_index?: number;
  visibility?: number;
  latitude: number;
  longitude: number;
  timestamp: string;
}

interface WeatherRequest {
  latitude: number;
  longitude: number;
  timestamp?: Date;
}

class WeatherService {
  private static instance: WeatherService;
  private cache: Map<string, { data: WeatherData; expires: EpochMs }> = new Map();
  private readonly CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

  static getInstance(): WeatherService {
    if (!WeatherService.instance) {
      WeatherService.instance = new WeatherService();
    }
    return WeatherService.instance;
  }

  private generateCacheKey(lat: number, lng: number, timestamp?: Date): string {
    const time = timestamp ? timestamp.toISOString().split('T')[0] : 'current';
    return `${lat.toFixed(4)}_${lng.toFixed(4)}_${time}`;
  }

  private isCacheValid(cacheEntry: { data: WeatherData; expires: EpochMs }): boolean {
    return createEpochMs() < cacheEntry.expires; // Standardized timestamp comparison
  }

  async fetchWeatherData(request: WeatherRequest): Promise<WeatherData | null> {
    const { latitude, longitude, timestamp } = request;

    if (!latitude || !longitude) {
      logger.debug('❌ Cannot fetch weather data: missing location');
      return null;
    }

    // Check if online before attempting fetch
    if (!navigator.onLine) {
      logger.debug('⚠️ Offline - skipping weather fetch');
      return null;
    }

    // Check cache first
    const cacheKey = this.generateCacheKey(latitude, longitude, timestamp);
    const cached = this.cache.get(cacheKey);
    if (cached && this.isCacheValid(cached)) {
      logger.debug('✅ Weather data served from cache');
      return cached.data;
    }

    try {
      logger.debug('🌤️ Fetching weather data for location:', { latitude, longitude });
      
      // Add 15 second timeout to prevent blocking
      const weatherPromise = supabase.functions.invoke('fetch-weather', {
        body: {
          latitude,
          longitude,
          timestamp: timestamp ? timestamp.toISOString() : new Date().toISOString(),
        },
      });
      
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Weather fetch timeout')), 15000)
      );
      
      const { data, error } = await Promise.race([weatherPromise, timeoutPromise]);

      if (error) {
        logger.error('❌ Error fetching weather data:', error);
        return null;
      }

      if (data?.weatherData) {
        logger.debug('✅ Weather data fetched successfully:', data.weatherData.id);
        
        // Cache the result
        this.cache.set(cacheKey, {
          data: data.weatherData,
          expires: (createEpochMs() + this.CACHE_DURATION) as EpochMs // Standardized cache expiry
        });

        return data.weatherData;
      }

      return null;
    } catch (error) {
      logger.error('❌ Error in weather data fetch:', error);
      return null;
    }
  }

  async getWeatherForLocation(location: LocationData, timestamp?: Date): Promise<WeatherData | null> {
    return this.fetchWeatherData({
      latitude: location.latitude,
      longitude: location.longitude,
      timestamp
    });
  }

  async getWeatherForMission(mission: MissionData): Promise<string | null> {
    try {
      // Get the first measurement with location data
      const measurementWithLocation = mission.measurements.find(
        m => m.latitude && m.longitude
      );

      if (!measurementWithLocation?.latitude || !measurementWithLocation?.longitude) {
        logger.debug('❌ Cannot fetch weather for mission: no location data');
        return null;
      }

      // Use the mission start time for the weather data request
      const weatherData = await this.fetchWeatherData({
        latitude: measurementWithLocation.latitude,
        longitude: measurementWithLocation.longitude,
        timestamp: mission.startTime
      });

      if (weatherData) {
        logger.debug('✅ Weather data fetched for mission:', mission.id);
        return weatherData.id;
      }

      return null;
    } catch (error) {
      logger.error('❌ Error fetching weather for mission:', error);
      return null;
    }
  }

  async enrichMissionWithWeather(mission: MissionData): Promise<{ weatherDataId?: string }> {
    const result: { weatherDataId?: string } = {};

    // Skip if mission already has weather data
    if (mission.weatherDataId) {
      logger.debug('ℹ️ Mission already has weather data:', mission.id);
      return result;
    }

    try {
      const weatherDataId = await this.getWeatherForMission(mission);
      
      if (weatherDataId) {
        result.weatherDataId = weatherDataId;
        
        // Update the mission in the database
        logger.debug('💾 Updating mission in database with weather ID:', weatherDataId);
        const { error: updateError } = await supabase
          .from('missions')
          .update({ weather_data_id: weatherDataId })
          .eq('id', mission.id);

        if (updateError) {
          logger.error('❌ Failed to update mission with weather data:', updateError);
        } else {
          logger.debug('✅ Mission updated with weather data:', mission.id);
        }
      }
    } catch (error) {
      logger.error('❌ Error enriching mission with weather:', error);
    }

    return result;
  }

  async batchEnrichMissions(limit: number = 20): Promise<void> {
    try {
      // Get missions without weather data that have location measurements
      const { data: missionsToEnrich, error } = await supabase
        .from('missions')
        .select('id, name, start_time, weather_data_id')
        .is('weather_data_id', null)
        .limit(limit);

      if (error) {
        logger.error('❌ Error fetching missions to enrich:', error);
        return;
      }

      if (!missionsToEnrich?.length) {
        logger.debug('ℹ️ No missions found that need weather enrichment');
        return;
      }

      logger.debug(`🔄 Enriching ${missionsToEnrich.length} missions with weather data...`);

      for (const mission of missionsToEnrich) {
        // Get measurements for this mission
        const { data: measurements } = await supabase
          .from('measurements')
          .select('latitude, longitude, pm1, pm25, pm10, timestamp')
          .eq('mission_id', mission.id)
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)
          .limit(1);

        if (measurements?.length > 0) {
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
              latitude: measurements[0].latitude!,
              longitude: measurements[0].longitude!,
            }]
          };

          await this.enrichMissionWithWeather(missionData as MissionData);
          
          // Add delay to avoid overwhelming the APIs
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      logger.debug('✅ Batch mission weather enrichment completed');
    } catch (error) {
      logger.error('❌ Error in batch mission enrichment:', error);
    }
  }

  clearCache(): void {
    this.cache.clear();
    logger.debug('🧹 Weather cache cleared');
  }
}

// Export singleton instance
export const weatherService = WeatherService.getInstance();