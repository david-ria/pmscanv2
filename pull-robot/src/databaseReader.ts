import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';
import { logger } from './logger.js';
import type { PendingMission } from './databasePoller.js';

const supabase = createClient(config.supabase.url, config.supabase.key);

export interface ATMPayload {
  deviceId: string;
  timestamp: string;
  measurements: Record<string, { value: number; unit: string }>;
}

async function readMissionMeasurements(missionId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('measurements')
      .select('*')
      .eq('mission_id', missionId)
      .order('timestamp', { ascending: true });

    if (error) {
      logger.error(`Error reading measurements for mission ${missionId}:`, { error: error.message });
      return [];
    }

    return data || [];
  } catch (error: any) {
    logger.error(`Error reading measurements for mission ${missionId}:`, { error: error.message });
    return [];
  }
}

export function transformToATMPayload(
  mission: PendingMission,
  measurement: any
): ATMPayload {
  const deviceId = mission.device_name || 'PMScan3376DF';
  const timestamp = measurement.timestamp || measurement.recorded_at;

  const measurements: Record<string, { value: number; unit: string }> = {};

  // Add PM measurements
  if (measurement.pm1 !== null && measurement.pm1 !== undefined) {
    measurements.pm1 = {
      value: parseFloat(measurement.pm1),
      unit: config.processing.units.pm1 || 'ugm3'
    };
  }

  if (measurement.pm25 !== null && measurement.pm25 !== undefined) {
    measurements.pm25 = {
      value: parseFloat(measurement.pm25),
      unit: config.processing.units.pm25 || 'ugm3'
    };
  }

  if (measurement.pm10 !== null && measurement.pm10 !== undefined) {
    measurements.pm10 = {
      value: parseFloat(measurement.pm10),
      unit: config.processing.units.pm10 || 'ugm3'
    };
  }

  // Add GPS coordinates if available
  if (measurement.latitude && measurement.longitude) {
    measurements.latitude = {
      value: parseFloat(measurement.latitude),
      unit: config.processing.units.latitude || 'degrees'
    };
    measurements.longitude = {
      value: parseFloat(measurement.longitude),
      unit: config.processing.units.longitude || 'degrees'
    };
  }

  return {
    deviceId,
    timestamp,
    measurements
  };
}

export async function processMissionData(mission: PendingMission): Promise<ATMPayload[]> {
  try {
    logger.info(`Reading measurements for mission ${mission.id}`);
    
    const measurements = await readMissionMeasurements(mission.id);
    
    if (measurements.length === 0) {
      logger.warn(`No measurements found for mission ${mission.id}`);
      return [];
    }

    const payloads: ATMPayload[] = [];

    for (const measurement of measurements) {
      try {
        const payload = transformToATMPayload(mission, measurement);
        payloads.push(payload);
      } catch (error: any) {
        logger.error(`Failed to transform measurement ${measurement.id}:`, { error: error.message });
      }
    }

    logger.info(`Generated ${payloads.length} payloads for mission ${mission.id}`);
    return payloads;

  } catch (error: any) {
    logger.error(`Error processing mission data for ${mission.id}:`, { error: error.message });
    return [];
  }
}