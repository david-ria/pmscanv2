import { PMScanData, PMScanInternalState } from './types';
import { DT_2000 } from './constants';

export function parsePMScanDataPayload(
  charValue: DataView, 
  pmScanState: PMScanInternalState
): PMScanData {
  const rawData = new Uint8Array(charValue.buffer);
  const ts2000 = ((rawData[3] & 0xFF) << 24) | ((rawData[2] & 0xFF) << 16) | ((rawData[1] & 0xFF) << 8) | (rawData[0] & 0xFF);
  
  const data = {
    pm1: (((rawData[9] & 0xFF) << 8) | (rawData[8] & 0xFF)) / 10,
    pm25: (((rawData[11] & 0xFF) << 8) | (rawData[10] & 0xFF)) / 10,
    pm10: (((rawData[13] & 0xFF) << 8) | (rawData[12] & 0xFF)) / 10,
    temp: (((rawData[15] & 0xFF) << 8) | (rawData[14] & 0xFF)) / 10,
    humidity: (((rawData[17] & 0xFF) << 8) | (rawData[16] & 0xFF)) / 10,
    battery: pmScanState.battery,
    charging: pmScanState.charging === 1,
    timestamp: new Date(), // Use smartphone time instead of device time
    location: "PMScan Device"
  };
  
  // Note: Logging moved to handlers to avoid duplicate logs
  return data;
}