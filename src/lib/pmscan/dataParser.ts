import { SensorReadingData as PMScanData, SensorReadingData, PMScanInternalState } from '@/types/sensor';
import { DT_2000 } from './constants';
import { createTimestamp } from '@/utils/timeFormat';

export function parsePMScanDataPayload(
  charValue: DataView,
  pmScanState: PMScanInternalState
): PMScanData {
  const rawData = new Uint8Array(charValue.buffer);
  const ts2000 =
    ((rawData[3] & 0xff) << 24) |
    ((rawData[2] & 0xff) << 16) |
    ((rawData[1] & 0xff) << 8) |
    (rawData[0] & 0xff);

  const data: PMScanData = {
    pm1: (((rawData[9] & 0xff) << 8) | (rawData[8] & 0xff)) / 10,
    pm25: (((rawData[11] & 0xff) << 8) | (rawData[10] & 0xff)) / 10,
    pm10: (((rawData[13] & 0xff) << 8) | (rawData[12] & 0xff)) / 10,
    temp: (((rawData[15] & 0xff) << 8) | (rawData[14] & 0xff)) / 10,
    humidity: (((rawData[17] & 0xff) << 8) | (rawData[16] & 0xff)) / 10,
    // PMScan does NOT support pressure or TVOC - explicitly undefined
    pressure: undefined,
    tvoc: undefined,
    battery: pmScanState.battery,
    charging: pmScanState.charging === 1,
    timestamp: createTimestamp(), // Single source: smartphone time for consistency
    location: 'PMScan Device',
  };

  // Note: Logging moved to handlers to avoid duplicate logs
  return data;
}

/**
 * Parse RT data from a DataView into SensorReadingData
 * This is a convenience wrapper for use without full PMScan state
 */
export function parseRTData(charValue: DataView): SensorReadingData | null {
  try {
    const rawData = new Uint8Array(charValue.buffer);
    
    // Basic validation
    if (rawData.length < 18) {
      return null;
    }

    return {
      pm1: (((rawData[9] & 0xff) << 8) | (rawData[8] & 0xff)) / 10,
      pm25: (((rawData[11] & 0xff) << 8) | (rawData[10] & 0xff)) / 10,
      pm10: (((rawData[13] & 0xff) << 8) | (rawData[12] & 0xff)) / 10,
      temp: (((rawData[15] & 0xff) << 8) | (rawData[14] & 0xff)) / 10,
      humidity: (((rawData[17] & 0xff) << 8) | (rawData[16] & 0xff)) / 10,
      // PMScan does NOT support pressure or TVOC - explicitly undefined
      pressure: undefined,
      tvoc: undefined,
      battery: 0, // Will be updated separately
      charging: false,
      timestamp: createTimestamp(),
      location: 'PMScan Device',
    };
  } catch (error) {
    return null;
  }
}
