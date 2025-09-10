import { PMScanData, PMScanInternalState } from './types';
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
    battery: pmScanState.battery,
    charging: pmScanState.charging === 1,
    timestamp: createTimestamp(), // Single source: smartphone time for consistency
    location: 'PMScan Device',
  };

  // Parse new particle count data if available (bytes 128-137)
  if (rawData.length > 137) {
    data.particles_02_05 = ((rawData[129] & 0xff) << 8) | (rawData[128] & 0xff); // 0.2µm to 0.5µm
    data.particles_05_10 = ((rawData[131] & 0xff) << 8) | (rawData[130] & 0xff); // 0.5µm to 1.0µm
    data.particles_10_25 = ((rawData[133] & 0xff) << 8) | (rawData[132] & 0xff); // 1.0µm to 2.5µm
    data.particles_25_50 = ((rawData[135] & 0xff) << 8) | (rawData[134] & 0xff); // 2.5µm to 5.0µm
    data.particles_50_100 = ((rawData[137] & 0xff) << 8) | (rawData[136] & 0xff); // 5.0µm to 10.0µm
  }

  // Parse external sensor data if available (bytes 145-146)
  if (rawData.length > 146) {
    data.external_temperature = (rawData[145] & 0xff) / 100; // External temperature (°C)
    data.external_humidity = (rawData[146] & 0xff) / 100; // External humidity (%)
  }

  // Note: Logging moved to handlers to avoid duplicate logs
  return data;
}
