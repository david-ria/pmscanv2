// src/lib/sensorConstants.ts
// Centralized Bluetooth GATT configurations for all supported sensors

import { SensorId } from '@/hooks/useActiveSensor';

export interface SensorGattConfig {
  id: SensorId;
  name: string;
  serviceUuid: string;
  filters: BluetoothLEScanFilter[];
}

export const SENSOR_GATT_CONFIG: Record<SensorId, SensorGattConfig> = {
  pmscan: {
    id: 'pmscan',
    name: 'PMScan V2',
    serviceUuid: 'f3641900-00b0-4240-ba50-05ca45bf8abc',
    filters: [
      { namePrefix: 'PMScan' }, 
      { services: ['f3641900-00b0-4240-ba50-05ca45bf8abc'] }
    ]
  },
  airbeam: {
    id: 'airbeam',
    name: 'AirBeam Pro',
    serviceUuid: '0000181a-0000-1000-8000-00805f9b34fb', // Generic environmental service
    filters: [
      { services: ['0000181a-0000-1000-8000-00805f9b34fb'] }
    ]
  },
  atmotube: {
    id: 'atmotube',
    name: 'Atmotube Pro',
    serviceUuid: '4b13a770-4ccb-11e5-a151-0002a5d5c51b', // Private Atmotube service
    filters: [
      { services: ['4b13a770-4ccb-11e5-a151-0002a5d5c51b'] }
    ]
  }
} as const;

// Unified filter list for universal Bluetooth scan
export const UNIVERSAL_SCAN_OPTIONS: RequestDeviceOptions = {
  filters: [
    ...SENSOR_GATT_CONFIG.pmscan.filters,
    ...SENSOR_GATT_CONFIG.airbeam.filters,
    ...SENSOR_GATT_CONFIG.atmotube.filters
  ],
  // Optional services for better discovery
  optionalServices: [
    SENSOR_GATT_CONFIG.pmscan.serviceUuid,
    SENSOR_GATT_CONFIG.airbeam.serviceUuid,
    SENSOR_GATT_CONFIG.atmotube.serviceUuid,
    // Standard sensor services
    'battery_service',
    'device_information'
  ]
};

/**
 * Detects the sensor type from a connected Bluetooth device
 * by checking which services are available on the GATT server
 */
export async function detectSensorType(server: BluetoothRemoteGATTServer): Promise<SensorId | null> {
  const sensorIds: SensorId[] = ['pmscan', 'airbeam', 'atmotube'];
  
  for (const sensorId of sensorIds) {
    const config = SENSOR_GATT_CONFIG[sensorId];
    try {
      await server.getPrimaryService(config.serviceUuid);
      return sensorId;
    } catch {
      // Service not found, try next sensor
      continue;
    }
  }
  
  return null;
}

/**
 * Detects sensor type from device name (fallback for quick detection)
 */
export function detectSensorTypeFromName(deviceName: string | undefined): SensorId | null {
  if (!deviceName) return null;
  
  const nameLower = deviceName.toLowerCase();
  
  if (nameLower.includes('pmscan')) return 'pmscan';
  if (nameLower.includes('airbeam')) return 'airbeam';
  if (nameLower.includes('atmotube')) return 'atmotube';
  
  return null;
}

/**
 * Get human-readable sensor name from ID
 */
export function getSensorDisplayName(sensorId: SensorId): string {
  return SENSOR_GATT_CONFIG[sensorId]?.name || sensorId;
}
