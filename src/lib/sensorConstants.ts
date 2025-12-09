// src/lib/sensorConstants.ts
// Centralized Bluetooth GATT configurations for all supported sensors

export const SENSOR_GATT_CONFIG = {
  pmscan: {
    id: 'pmscan' as const,
    name: 'PMScan V2',
    serviceUuid: 'f3641900-00b0-4240-ba50-05ca45bf8abc',
    filters: [
      { namePrefix: 'PMScan' }, 
      { services: ['f3641900-00b0-4240-ba50-05ca45bf8abc'] }
    ]
  },
  airbeam: {
    id: 'airbeam' as const,
    name: 'AirBeam',
    // OFFICIAL AirBeam2/3 BLE UUIDs (standard 16-bit format)
    serviceUuid: '0000fff0-0000-1000-8000-00805f9b34fb', // Main FFF0 service
    pmCharacteristicUuid: '0000fff3-0000-1000-8000-00805f9b34fb', // PM1, PM2.5, PM10 (6 bytes)
    envCharacteristicUuid: '0000fff4-0000-1000-8000-00805f9b34fb', // Temp, Humidity (4 bytes)
    batteryCharacteristicUuid: '0000fff6-0000-1000-8000-00805f9b34fb', // Battery level (1 byte)
    filters: [
      { namePrefix: 'AirBeam' },
      { namePrefix: 'AB-' },
      { namePrefix: 'AB3' },
    ]
  },
  atmotube: {
    id: 'atmotube' as const,
    name: 'Atmotube Pro',
    // OFFICIAL UUID from atmotube-pro2-android GitHub
    serviceUuid: 'bda3c091-e5e0-4dac-8170-7fcef187a1d0',
    filters: [
      { namePrefix: 'Atmotube' },
    ]
  }
} as const;

// Derive SensorId type from the config keys
export type SensorId = keyof typeof SENSOR_GATT_CONFIG;

// Option 1: Filtres stricts par nom ET service - utilisé par défaut
// Les services DOIVENT être dans optionalServices pour être accessibles après connexion
export const FILTERED_SCAN_OPTIONS: RequestDeviceOptions = {
  filters: [
    // Filtres par nom de capteur (toutes variations)
    { namePrefix: 'PMScan' },
    { namePrefix: 'PMSCAN' },
    { namePrefix: 'pmscan' },
    { namePrefix: 'AirBeam' },
    { namePrefix: 'AIRBEAM' },
    { namePrefix: 'Airbeam' },
    { namePrefix: 'AB-' },
    { namePrefix: 'AB3' },
    { namePrefix: 'Atmotube' },
    { namePrefix: 'ATMOTUBE' },
    { namePrefix: 'atmotube' },
    { namePrefix: 'ATM-' },
    // CRITIQUE: Filtre par service AirBeam FFF0 pour forcer la découverte
    { services: ['0000fff0-0000-1000-8000-00805f9b34fb'] },
  ] as BluetoothLEScanFilter[],
  // CRITIQUE: Ces services DOIVENT être listés ici pour être accessibles après connexion
  optionalServices: [
    // AirBeam 2/3 - Service principal FFF0 (CONFIRMÉ via nRF Connect)
    '0000fff0-0000-1000-8000-00805f9b34fb',
    // PMScan
    SENSOR_GATT_CONFIG.pmscan.serviceUuid,
    // Atmotube PRO 2
    SENSOR_GATT_CONFIG.atmotube.serviceUuid,
    // Atmotube PRO (UUID alternatif)
    'db450001-8e9a-4818-add7-6ed94a328ab4',
    // Services standards BLE
    '0000181a-0000-1000-8000-00805f9b34fb', // Environmental Sensing (0x181A)
    '0000180f-0000-1000-8000-00805f9b34fb', // Battery Service (0x180F)
    '0000180a-0000-1000-8000-00805f9b34fb', // Device Information (0x180A)
    // Nordic UART Service (ESP32)
    '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
    // HM-10 style modules
    '0000ffe0-0000-1000-8000-00805f9b34fb',
  ]
};

// Option 2: SCAN LARGE - affiche TOUS les appareils Bluetooth
// Utilisé quand les filtres stricts ne trouvent pas les capteurs
export const UNIVERSAL_SCAN_OPTIONS = {
  acceptAllDevices: true,
  // CRITIQUE: Ces services DOIVENT être listés ici pour être accessibles après connexion
  optionalServices: [
    // AirBeam 2/3 - Service principal FFF0 (CONFIRMÉ via nRF Connect)
    '0000fff0-0000-1000-8000-00805f9b34fb',
    // PMScan
    SENSOR_GATT_CONFIG.pmscan.serviceUuid,
    // Atmotube PRO 2
    SENSOR_GATT_CONFIG.atmotube.serviceUuid,
    // Atmotube PRO (UUID alternatif)
    'db450001-8e9a-4818-add7-6ed94a328ab4',
    // Services standards BLE
    '0000181a-0000-1000-8000-00805f9b34fb', // Environmental Sensing (0x181A)
    '0000180f-0000-1000-8000-00805f9b34fb', // Battery Service (0x180F)
    '0000180a-0000-1000-8000-00805f9b34fb', // Device Information (0x180A)
    // Nordic UART Service (ESP32)
    '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
    // HM-10 style modules
    '0000ffe0-0000-1000-8000-00805f9b34fb',
  ]
} as RequestDeviceOptions;

// Options de scan pour Capacitor BleClient (mobile natif)
// Scan large obligatoire sans filtrage UUID
export const CAPACITOR_SCAN_OPTIONS = {
  services: [], // Scan large - pas de filtrage par service
  allowDuplicates: true,
  scanMode: 2 // SCAN_MODE_LOW_LATENCY = 2
};

// Noms de capteurs valides pour le filtrage côté callback
export const VALID_SENSOR_NAMES = ['pmscan', 'airbeam', 'atmotube'] as const;

/**
 * Vérifie si un nom d'appareil correspond à un capteur supporté
 */
export function isValidSensorName(deviceName: string | undefined): boolean {
  if (!deviceName) return false;
  const nameLower = deviceName.toLowerCase();
  return VALID_SENSOR_NAMES.some(sensor => nameLower.includes(sensor));
}

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
