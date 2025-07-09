import { AirBeamData, AirBeamState } from './types';
import { AIRBEAM_DATA_SEPARATOR, AIRBEAM_MEASUREMENT_SEPARATOR } from './constants';

/**
 * Parse AirBeam data from text format
 * Expected format: "sessionId;timestamp,sensorName,value,units,latitude,longitude"
 * Example: "12345;1234567890,AirBeam2-PM2.5,25.3,µg/m³,40.7128,-74.0060"
 */
export function parseAirBeamDataPayload(data: string, state: AirBeamState): AirBeamData | null {
  try {
    console.log('🔄 Parsing AirBeam data:', data);
    
    const lines = data.trim().split('\n');
    const measurements: Partial<AirBeamData> = {
      timestamp: new Date(),
      pm1: 0,
      pm25: 0,
      pm10: 0
    };
    
    for (const line of lines) {
      if (!line.includes(AIRBEAM_DATA_SEPARATOR)) continue;
      
      const [sessionId, measurementData] = line.split(AIRBEAM_DATA_SEPARATOR);
      
      if (!measurementData) continue;
      
      const parts = measurementData.split(AIRBEAM_MEASUREMENT_SEPARATOR);
      if (parts.length < 4) continue;
      
      const [timestamp, sensorName, valueStr, units] = parts;
      const value = parseFloat(valueStr);
      
      if (isNaN(value)) continue;
      
      // Map sensor names to our data structure
      if (sensorName.includes('PM1')) {
        measurements.pm1 = value;
      } else if (sensorName.includes('PM2.5') || sensorName.includes('PM25')) {
        measurements.pm25 = value;
      } else if (sensorName.includes('PM10')) {
        measurements.pm10 = value;
      } else if (sensorName.includes('Temperature') || sensorName.includes('Temp')) {
        measurements.temperature = value;
      } else if (sensorName.includes('Humidity') || sensorName.includes('RH')) {
        measurements.humidity = value;
      }
      
      // Use timestamp from data if available
      const timestampNum = parseInt(timestamp);
      if (!isNaN(timestampNum)) {
        measurements.timestamp = new Date(timestampNum * 1000);
      }
      
      measurements.sessionId = sessionId;
    }
    
    // Only return data if we have at least one PM measurement
    if (measurements.pm1! > 0 || measurements.pm25! > 0 || measurements.pm10! > 0) {
      return measurements as AirBeamData;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error parsing AirBeam data:', error);
    return null;
  }
}

/**
 * Parse simple numeric data format (fallback)
 * Format: "PM2.5:25.3,PM10:45.2,PM1:12.1"
 */
export function parseSimpleAirBeamData(data: string): AirBeamData | null {
  try {
    const measurements: Partial<AirBeamData> = {
      timestamp: new Date(),
      pm1: 0,
      pm25: 0,
      pm10: 0
    };
    
    const pairs = data.split(',');
    for (const pair of pairs) {
      const [key, valueStr] = pair.split(':');
      const value = parseFloat(valueStr);
      
      if (isNaN(value)) continue;
      
      if (key.includes('PM1')) {
        measurements.pm1 = value;
      } else if (key.includes('PM2.5') || key.includes('PM25')) {
        measurements.pm25 = value;
      } else if (key.includes('PM10')) {
        measurements.pm10 = value;
      }
    }
    
    if (measurements.pm1! > 0 || measurements.pm25! > 0 || measurements.pm10! > 0) {
      return measurements as AirBeamData;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error parsing simple AirBeam data:', error);
    return null;
  }
}