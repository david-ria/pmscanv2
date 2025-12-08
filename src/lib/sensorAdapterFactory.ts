// src/lib/sensorAdapterFactory.ts
// Factory for dynamically loading sensor adapters based on detected sensor type

import { ISensorAdapter } from '@/types/sensor';
import { SensorId, SENSOR_GATT_CONFIG } from '@/lib/sensorConstants';
import * as logger from '@/utils/logger';

/**
 * Dynamically loads and instantiates the appropriate sensor adapter
 * based on the detected sensor ID
 */
export async function getSensorAdapter(sensorId: SensorId): Promise<ISensorAdapter> {
  logger.debug(`🔧 Loading adapter for sensor: ${sensorId}`);
  
  switch (sensorId) {
    case 'pmscan': {
      const { PMScanAdapter } = await import('@/lib/pmscan/PMScanAdapter');
      return new PMScanAdapter();
    }
    case 'airbeam': {
      const { AirBeamAdapter } = await import('@/lib/airbeam/AirBeamAdapter');
      return new AirBeamAdapter();
    }
    case 'atmotube': {
      const { AtmotubeAdapter } = await import('@/lib/atmotube/AtmotubeAdapter');
      return new AtmotubeAdapter();
    }
    default:
      throw new Error(`Unknown sensor ID: ${sensorId}`);
  }
}

/**
 * Identifies the sensor type by checking which service UUID is available
 * on the connected GATT server
 */
export async function identifySensorByService(server: BluetoothRemoteGATTServer): Promise<SensorId | null> {
  const sensorIds: SensorId[] = ['pmscan', 'airbeam', 'atmotube'];
  
  for (const sensorId of sensorIds) {
    const config = SENSOR_GATT_CONFIG[sensorId];
    try {
      logger.debug(`🔍 Checking for ${config.name} service (${config.serviceUuid})...`);
      await server.getPrimaryService(config.serviceUuid);
      logger.debug(`✅ Found ${config.name} service!`);
      return sensorId;
    } catch {
      // Service not found, try next sensor
      logger.debug(`❌ ${config.name} service not found`);
      continue;
    }
  }
  
  logger.warn('⚠️ No supported sensor service found on device');
  return null;
}

/**
 * Identifies the sensor type from the device name
 * This is a quick fallback when service detection is not needed
 */
export function identifySensorByName(deviceName: string | undefined): SensorId | null {
  if (!deviceName) return null;
  
  const nameLower = deviceName.toLowerCase();
  
  if (nameLower.includes('pmscan')) return 'pmscan';
  if (nameLower.includes('airbeam')) return 'airbeam';
  if (nameLower.includes('atmotube')) return 'atmotube';
  
  return null;
}

/**
 * Get the display name for a sensor ID
 */
export function getSensorDisplayName(sensorId: SensorId): string {
  return SENSOR_GATT_CONFIG[sensorId]?.name || sensorId;
}
