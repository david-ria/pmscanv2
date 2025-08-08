/**
 * Serializable versions of types to avoid DataCloneError
 * These use numeric timestamps instead of Date objects
 */

export interface SerializablePMScanData {
  pm1: number;
  pm25: number;
  pm10: number;
  temp: number;
  humidity: number;
  battery: number;
  charging: boolean;
  timestamp: number; // numeric timestamp instead of Date
  location?: string;
}

export interface SerializableLocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number;
  timestamp: number; // numeric timestamp instead of Date
}

export interface SerializableRecordingEntry {
  pmData: SerializablePMScanData;
  location?: SerializableLocationData;
  context?: {
    location: string;
    activity: string;
  };
  automaticContext?: string;
  timestamp: number; // numeric timestamp instead of Date
  weatherDataId?: string;
}

// Utility functions to convert between Date and numeric formats
export function toSerializablePMScanData(data: any): SerializablePMScanData {
  return {
    pm1: Number(data.pm1) || 0,
    pm25: Number(data.pm25) || 0,
    pm10: Number(data.pm10) || 0,
    temp: Number(data.temp) || 0,
    humidity: Number(data.humidity) || 0,
    battery: Number(data.battery) || 0,
    charging: Boolean(data.charging),
    timestamp: typeof data.timestamp === 'number' ? data.timestamp : new Date(data.timestamp).getTime(),
    location: data.location,
  };
}

export function toSerializableLocationData(data: any): SerializableLocationData {
  return {
    latitude: Number(data.latitude) || 0,
    longitude: Number(data.longitude) || 0,
    accuracy: Number(data.accuracy) || 0,
    altitude: data.altitude ? Number(data.altitude) : undefined,
    timestamp: typeof data.timestamp === 'number' ? data.timestamp : new Date(data.timestamp).getTime(),
  };
}

export function toPMScanData(data: SerializablePMScanData): any {
  return {
    ...data,
    timestamp: new Date(data.timestamp),
  };
}

export function toLocationData(data: SerializableLocationData): any {
  return {
    ...data,
    timestamp: new Date(data.timestamp),
  };
}