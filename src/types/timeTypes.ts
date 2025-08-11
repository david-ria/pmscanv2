/**
 * Unified time types - all timestamps as numeric epoch ms UTC
 */

// Core PM Scan Data with numeric timestamps
export interface PMScanData {
  pm1: number;
  pm25: number;
  pm10: number;
  temp: number;
  humidity: number;
  battery: number;
  charging: boolean;
  timestamp: number; // epoch ms UTC
  location?: string;
}

// Location data with numeric timestamps
export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number;
  timestamp: number; // epoch ms UTC
}

// Recording entry with numeric timestamps
export interface RecordingEntry {
  pmData: PMScanData;
  location?: LocationData;
  context?: {
    location: string;
    activity: string;
  };
  automaticContext?: string;
  timestamp: number; // epoch ms UTC
  weatherDataId?: string;
}

// Legacy conversion helpers (use sparingly)
export function toPMScanDataLegacy(data: PMScanData): any {
  return {
    ...data,
    timestamp: new Date(data.timestamp),
  };
}

export function toLocationDataLegacy(data: LocationData): any {
  return {
    ...data,
    timestamp: new Date(data.timestamp),
  };
}