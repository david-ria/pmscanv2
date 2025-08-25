import { createClient } from '@supabase/supabase-js';
import { logger } from './logger.js';
import type { Config } from './config.js';
import type { PendingMission } from './databasePoller.js';

// Data structures
interface MissionMeasurement {
  id: string;
  timestamp: string;
  pm1?: number;
  pm25?: number;
  pm10?: number;
  temperature?: number;
  humidity?: number;
  pressure?: number;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  speed?: number;
  heading?: number;
  accuracy?: number;
  battery_level?: number;
  rssi?: number;
  device_name?: string;
  geohash?: string;
}

interface ATMPayload {
  device: string;
  timestamp: string;
  measurement_id: string;
  metrics: Record<string, number>;
  units: Record<string, string>;
}

// Supabase client
let supabase: any = null;
let appConfig: Config | null = null;

/**
 * Initialize database reader with configuration
 */
export function initializeDatabaseReader(config: Config) {
  appConfig = config;
  supabase = createClient(config.supabase.url, config.supabase.key);
}

/**
 * Read all measurements for a mission from database
 */
async function readMissionMeasurements(missionId: string): Promise<MissionMeasurement[]> {
  if (!supabase) {
    throw new Error('Database reader not initialized');
  }
  
  try {
    const { data, error } = await supabase
      .from('measurements')
      .select('*')
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
 * Transform measurement data into ATM API payload format
 */
function transformToATMPayload(mission: PendingMission, measurement: MissionMeasurement): ATMPayload {
  if (!appConfig) {
    throw new Error('Database reader not initialized');
  }
  
  const metrics: Record<string, number> = {};
  const units: Record<string, string> = {};

  // Only include configured metrics
  for (const metric of appConfig.processing.includeMetrics) {
    const value = (measurement as any)[metric];
    if (value !== null && value !== undefined) {
      metrics[metric] = Number(value);
      units[metric] = appConfig.processing.units[metric] || 'unknown';
    }
  }

  return {
    device: mission.device_name,
    timestamp: measurement.timestamp,
    measurement_id: measurement.id,
    metrics,
    units,
  };
}

/**
 * Process mission data and convert to ATM API payloads
 */
export async function processMissionData(mission: PendingMission): Promise<ATMPayload[]> {
  logger.debug(`🔧 Processing data for mission ${mission.id}`);

  try {
    // Read all measurements for the mission
    const measurements = await readMissionMeasurements(mission.id);
    
    if (measurements.length === 0) {
      logger.warn(`⚠️ No measurements found for mission ${mission.id}`);
      return [];
    }

    // Transform each measurement into an ATM payload
    const payloads: ATMPayload[] = [];
    for (const measurement of measurements) {
      try {
        const payload = transformToATMPayload(mission, measurement);
        payloads.push(payload);
      } catch (error) {
        logger.error(`Failed to transform measurement ${measurement.id}:`, error);
        // Continue processing other measurements
      }
    }

    logger.debug(`✅ Transformed ${payloads.length}/${measurements.length} measurements for mission ${mission.id}`);
    return payloads;

  } catch (error) {
    logger.error(`Error processing mission data for ${mission.id}:`, error);
    return [];
  }
}

export type { MissionMeasurement, ATMPayload };