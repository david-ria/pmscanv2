import { PMScanData, PMScanDevice } from '@/lib/pmscan/types';
import { AirBeamData, AirBeamDevice } from '@/lib/airbeam/types';
import { UnifiedDeviceData, UnifiedDevice } from './types';

/**
 * Convert unified device data to PMScan format for backward compatibility
 */
export function toPMScanData(data: UnifiedDeviceData): PMScanData {
  if ('temp' in data) {
    // Already PMScan data
    return data as PMScanData;
  }
  
  // Convert AirBeam data to PMScan format
  const airBeamData = data as AirBeamData;
  return {
    timestamp: airBeamData.timestamp,
    pm1: airBeamData.pm1,
    pm25: airBeamData.pm25,
    pm10: airBeamData.pm10,
    temp: airBeamData.temperature || 0, // Default to 0 if not available
    humidity: airBeamData.humidity || 0, // Default to 0 if not available
    battery: 0, // AirBeam doesn't typically report battery over Bluetooth
    charging: false
  };
}

/**
 * Convert unified device to PMScan format for backward compatibility
 */
export function toPMScanDevice(device: UnifiedDevice): PMScanDevice {
  if ('mode' in device) {
    // Already PMScan device
    return device as PMScanDevice;
  }
  
  // Convert AirBeam device to PMScan format
  const airBeamDevice = device as AirBeamDevice;
  return {
    name: airBeamDevice.name,
    connected: airBeamDevice.connected,
    battery: airBeamDevice.battery || 0,
    charging: airBeamDevice.charging || false,
    version: 1, // Default version number for AirBeam
    mode: 0, // Default mode for AirBeam
    interval: 1000 // Default interval
  };
}

/**
 * Check if device data has temperature sensor
 */
export function hasTemperatureSensor(data: UnifiedDeviceData): boolean {
  if ('temp' in data) {
    return true; // PMScan always has temperature
  }
  
  const airBeamData = data as AirBeamData;
  return airBeamData.temperature !== undefined;
}

/**
 * Get temperature value from unified data
 */
export function getTemperature(data: UnifiedDeviceData): number | undefined {
  if ('temp' in data) {
    return (data as PMScanData).temp;
  }
  
  return (data as AirBeamData).temperature;
}

/**
 * Check if device has battery information
 */
export function hasBatteryInfo(device: UnifiedDevice): boolean {
  if ('mode' in device) {
    return true; // PMScan always has battery info
  }
  
  const airBeamDevice = device as AirBeamDevice;
  return airBeamDevice.battery !== undefined;
}