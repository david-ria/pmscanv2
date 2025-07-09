import { DeviceType } from './types';
import { AIRBEAM_NAME_PATTERNS } from '@/lib/airbeam/constants';

/**
 * Detect device type based on device name
 */
export function detectDeviceType(deviceName: string): DeviceType | null {
  if (!deviceName) return null;
  
  const lowerName = deviceName.toLowerCase();
  
  // Check for AirBeam patterns first
  const isAirBeam = AIRBEAM_NAME_PATTERNS.some(pattern => 
    lowerName.includes(pattern.toLowerCase())
  );
  
  if (isAirBeam) {
    return 'airbeam';
  }
  
  // Check for PMScan patterns
  if (lowerName.includes('pmscan') || lowerName.includes('pm scan')) {
    return 'pmscan';
  }
  
  // Default to null if unknown
  return null;
}

/**
 * Get device type display name
 */
export function getDeviceTypeDisplayName(deviceType: DeviceType): string {
  switch (deviceType) {
    case 'pmscan':
      return 'PMScan';
    case 'airbeam':
      return 'AirBeam';
    default:
      return 'Unknown Device';
  }
}

/**
 * Check if device supports specific features
 */
export function getDeviceCapabilities(deviceType: DeviceType) {
  switch (deviceType) {
    case 'pmscan':
      return {
        hasTemperature: true,
        hasHumidity: true,
        hasBattery: true,
        hasCharging: true,
        supportsRealTimeMode: true,
        supportsDataLogging: true
      };
    case 'airbeam':
      return {
        hasTemperature: true,
        hasHumidity: true,
        hasBattery: false, // Usually not reported over Bluetooth
        hasCharging: false,
        supportsRealTimeMode: true,
        supportsDataLogging: true
      };
    default:
      return {
        hasTemperature: false,
        hasHumidity: false,
        hasBattery: false,
        hasCharging: false,
        supportsRealTimeMode: false,
        supportsDataLogging: false
      };
  }
}