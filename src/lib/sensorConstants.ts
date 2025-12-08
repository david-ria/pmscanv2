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
    name: 'AirBeam',
    // AirBeam uses HM-10/ESP32 serial service - name-based detection is primary
    serviceUuid: '0000ffe0-0000-1000-8000-00805f9b34fb',
    filters: [
      { namePrefix: 'AirBeam' }
    ]
  },
  atmotube: {
    id: 'atmotube',
    name: 'Atmotube Pro',
    // Official Atmotube Pro service UUID from documentation
    serviceUuid: 'db450001-8e9a-4818-add7-6ed94a328ab4',
    filters: [
      { namePrefix: 'ATMOTUBE' },
      { services: ['db450001-8e9a-4818-add7-6ed94a328ab4'] }
    ]
  }
} as const;

// Unified filter list for universal Bluetooth scan
export const UNIVERSAL_SCAN_OPTIONS: RequestDeviceOptions = {
  filters: [
    // Name-based filters (most reliable)
    { namePrefix: 'PMScan' },
    { namePrefix: 'AirBeam' },
    { namePrefix: 'ATMOTUBE' },
    // Service-based filters as fallback
    { services: ['f3641900-00b0-4240-ba50-05ca45bf8abc'] }, // PMScan
    { services: ['db450001-8e9a-4818-add7-6ed94a328ab4'] }, // Atmotube
  ],
  optionalServices: [
    'f3641900-00b0-4240-ba50-05ca45bf8abc', // PMScan
    'db450001-8e9a-4818-add7-6ed94a328ab4', // Atmotube
    '0000ffe0-0000-1000-8000-00805f9b34fb', // AirBeam serial
    'battery_service',
    'device_information'
  ]
};

// Debug mode: accepts ALL Bluetooth devices (useful for testing)
// Note: Uses type assertion because acceptAllDevices is mutually exclusive with filters
export const DEBUG_SCAN_OPTIONS = {
  acceptAllDevices: true,
  optionalServices: [
    'f3641900-00b0-4240-ba50-05ca45bf8abc', // PMScan
    'db450001-8e9a-4818-add7-6ed94a328ab4', // Atmotube
    '0000ffe0-0000-1000-8000-00805f9b34fb', // AirBeam serial
    'battery_service',
    'device_information'
  ]
} as RequestDeviceOptions;

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
