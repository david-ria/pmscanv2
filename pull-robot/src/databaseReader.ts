import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';
import { logger } from './logger.js';
import type { PendingMission } from './databasePoller.js';

// Initialize Supabase client
const supabase = createClient(config.supabase.url, config.supabase.key);

// Data interfaces
interface MissionMeasurement {
  id: string;
  timestamp: string;
  pm1: number | null;
  pm25: number | null;
  pm10: number | null;
  latitude: number | null;
  longitude: number | null;
  temperature: number | null;
  humidity: number | null;
  pressure: number | null;
}

interface ATMPayload {
  device_id: string;
  timestamp: string;
  measurement_id: string;
  metrics: Record<string, number>;
  units: Record<string, string>;
}

/**
 * Read measurements for a mission from database
 */
async function readMissionMeasurements(missionId: string): Promise<MissionMeasurement[]> {
  try {
    const { data, error } = await supabase
      .from('measurements')
      .select(`
        id,
        timestamp,
        pm1,
        pm25,
        pm10,
        latitude,
        longitude,
        temperature,
        humidity,
        pressure
      `)
      .eq('mission_id', missionId)
      .order('timestamp', { ascending: true });

    if (error) {
      logger.error(`Failed to read measurements for mission ${missionId}:`, error);
      return [];
    }

    logger.debug(`📊 Read ${data?.length || 0} measurements for mission ${missionId}`);
    return data || [];
  } catch (error) {
    logger.error(`Error reading measurements for mission ${missionId}:`, error);
    return [];
  }
}

/**
 * Transform measurement to ATM API payload
 */
function transformToATMPayload(mission: PendingMission, measurement: MissionMeasurement): ATMPayload {
  const metrics: Record<string, number> = {};
  const units: Record<string, string> = {};

  // Add configured metrics
  for (const metric of config.processing.includeMetrics) {
    const value = measurement[metric as keyof MissionMeasurement];
    if (typeof value === 'number' && !isNaN(value)) {
      metrics[metric] = value;
      units[metric] = config.processing.units[metric] || 'unknown';
    }
  }

  return {
    device_id: mission.device_name,
    timestamp: measurement.timestamp,
    measurement_id: measurement.id,
    metrics,
    units,
  };
}

/**
 * Process mission data and return ATM payloads
 */
async function processMissionData(mission: PendingMission): Promise<ATMPayload[]> {
  logger.debug(`🔄 Processing mission ${mission.id} for device ${mission.device_name}`);
  
  const measurements = await readMissionMeasurements(mission.id);
  
  if (measurements.length === 0) {
    logger.warn(`⚠️ No measurements found for mission ${mission.id}`);
    return [];
  }

  const payloads = measurements.map(measurement => 
    transformToATMPayload(mission, measurement)
  );

  logger.debug(`✅ Generated ${payloads.length} payloads for mission ${mission.id}`);
  return payloads;
}

export {
  readMissionMeasurements,
  transformToATMPayload,
  processMissionData,
  type MissionMeasurement,
  type ATMPayload,
};