import { logger } from './logger.js';
import { config } from './config.js';
import { createClient } from '@supabase/supabase-js';
import type { PendingMission } from './databasePoller.js';

// Initialize Supabase client
const supabase = createClient(config.supabase.url, config.supabase.key);

export interface MissionMeasurement {
  timestamp: string;
  pm1: number;
  pm25: number;
  pm10: number;
  latitude?: number;
  longitude?: number;
  temperature?: number;
  humidity?: number;
}

export interface ATMPayload {
  deviceId: string;
  timestamp: string;
  measurements: {
    [key: string]: {
      value: number;
      unit: string;
    };
  };
}

/**
 * Read mission measurements from database
 */
export async function readMissionMeasurements(missionId: string): Promise<MissionMeasurement[]> {
  try {
    logger.info(`Reading measurements for mission ${missionId}`);

    const { data, error } = await supabase
      .from('measurements')
      .select('timestamp, pm1, pm25, pm10, latitude, longitude, temperature, humidity')
      .eq('mission_id', missionId)
      .order('timestamp', { ascending: true });

    if (error) {
      logger.error(`Failed to read measurements for mission ${missionId}:`, error);
      return [];
    }

    if (!data || data.length === 0) {
      logger.warn(`No measurements found for mission ${missionId}`);
      return [];
    }

    logger.info(`Retrieved ${data.length} measurements for mission ${missionId}`);
    return data.map(row => ({
      timestamp: row.timestamp,
      pm1: row.pm1,
      pm25: row.pm25,
      pm10: row.pm10,
      latitude: row.latitude || undefined,
      longitude: row.longitude || undefined,
      temperature: row.temperature || undefined,
      humidity: row.humidity || undefined
    }));
  } catch (error) {
    logger.error(`Error reading measurements for mission ${missionId}:`, { error: error.message });
    return [];
  }
}

/**
 * Transform measurement data to ATM API format
 */
export function transformToATMPayload(
  mission: PendingMission,
  measurement: MissionMeasurement
): ATMPayload {
  const deviceId = mission.device_name!;
  const timestamp = new Date(measurement.timestamp).toISOString();

  const measurements: { [key: string]: { value: number; unit: string } } = {};

  // Add PM measurements (always included)
  if (config.processing.includeMetrics.includes('pm1')) {
    measurements.pm1 = {
      value: measurement.pm1,
      unit: config.processing.units.pm1
    };
  }

  if (config.processing.includeMetrics.includes('pm25')) {
    measurements.pm25 = {
      value: measurement.pm25,
      unit: config.processing.units.pm25
    };
  }

  if (config.processing.includeMetrics.includes('pm10')) {
    measurements.pm10 = {
      value: measurement.pm10,
      unit: config.processing.units.pm10
    };
  }

  // Add location data if available and configured
  if (measurement.latitude && measurement.longitude) {
    if (config.processing.includeMetrics.includes('latitude')) {
      measurements.latitude = {
        value: measurement.latitude,
        unit: config.processing.units.latitude
      };
    }

    if (config.processing.includeMetrics.includes('longitude')) {
      measurements.longitude = {
        value: measurement.longitude,
        unit: config.processing.units.longitude
      };
    }
  }

  // Add environmental data if available and configured
  if (measurement.temperature && config.processing.includeMetrics.includes('temperature')) {
    measurements.temperature = {
      value: measurement.temperature,
      unit: config.processing.units.temperature || 'celsius'
    };
  }

  if (measurement.humidity && config.processing.includeMetrics.includes('humidity')) {
    measurements.humidity = {
      value: measurement.humidity,
      unit: config.processing.units.humidity || 'percent'
    };
  }

  return {
    deviceId,
    timestamp,
    measurements
  };
}

/**
 * Process mission data and generate ATM payloads
 */
export async function processMissionData(mission: PendingMission): Promise<ATMPayload[]> {
  try {
    logger.info(`Processing mission ${mission.id} for device ${mission.device_name}`);

    const measurements = await readMissionMeasurements(mission.id);
    
    if (measurements.length === 0) {
      logger.warn(`No measurements to process for mission ${mission.id}`);
      return [];
    }

    const payloads = measurements.map(measurement => 
      transformToATMPayload(mission, measurement)
    );

    logger.info(`Generated ${payloads.length} ATM payloads for mission ${mission.id}`);
    return payloads;
  } catch (error) {
    logger.error(`Error processing mission ${mission.id}:`, { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}