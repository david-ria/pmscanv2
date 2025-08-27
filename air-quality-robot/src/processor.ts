import { supabase } from './supabase.js';
import { postToATM } from './poster.js';
import { logger } from './logger.js';
import { config } from './config.js';

export interface Mission {
  id: string;
  device_name?: string;
  start_time: string;
  end_time: string;
}

export interface Measurement {
  id: string;
  mission_id: string;
  timestamp: string;
  pm1: number;
  pm25: number;
  pm10: number;
  latitude?: number;
  longitude?: number;
}

export async function processMission(mission: Mission): Promise<boolean> {
  try {
    logger.info(`🔄 Processing mission ${mission.id} for device ${mission.device_name}`);
    
    // Check if device is allowed
    if (config.device.allowedDeviceIds.length > 0 && mission.device_name) {
      if (!config.device.allowedDeviceIds.includes(mission.device_name)) {
        if (config.device.unknownDeviceBehavior === 'skip') {
          logger.info(`⏭️ Skipping mission ${mission.id} - device ${mission.device_name} not in allowed list`);
          return true; // Consider it "processed" so it doesn't get retried
        }
      }
    }
    
    // Get measurements for this mission
    const { data: measurements, error } = await supabase
      .from('measurements')
      .select('*')
      .eq('mission_id', mission.id)
      .order('timestamp', { ascending: true });

    if (error) {
      logger.error(`Error fetching measurements for mission ${mission.id}:`, error.message);
      return false;
    }

    if (!measurements || measurements.length === 0) {
      logger.info(`No measurements found for mission ${mission.id}`);
      return true; // Consider it processed
    }

    logger.info(`Processing ${measurements.length} measurements from mission ${mission.id}`);

    // Process each measurement
    let successCount = 0;
    for (const measurement of measurements) {
      const success = await processMeasurement(measurement, mission.device_name || 'unknown');
      if (success) successCount++;
    }

    const successRate = (successCount / measurements.length) * 100;
    logger.info(`✅ Mission ${mission.id} processed: ${successCount}/${measurements.length} (${successRate.toFixed(1)}%) successful`);
    
    return successRate >= 50; // Consider successful if at least 50% of measurements posted
  } catch (error) {
    logger.error(`Error processing mission ${mission.id}:`, error);
    return false;
  }
}

async function processMeasurement(measurement: Measurement, deviceName: string): Promise<boolean> {
  try {
    const payload = {
      device: deviceName,
      timestamp: measurement.timestamp,
      values: {
        pm1: measurement.pm1,
        pm25: measurement.pm25,
        pm10: measurement.pm10,
        ...(measurement.latitude && { latitude: measurement.latitude }),
        ...(measurement.longitude && { longitude: measurement.longitude })
      },
      units: {
        pm1: 'ugm3',
        pm25: 'ugm3',
        pm10: 'ugm3',
        ...(measurement.latitude && { latitude: 'degrees' }),
        ...(measurement.longitude && { longitude: 'degrees' })
      }
    };

    return await postToATM(payload);
  } catch (error) {
    logger.error(`Error processing measurement ${measurement.id}:`, error);
    return false;
  }
}