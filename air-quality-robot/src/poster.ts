import { config } from './config.js';
import { logger } from './logger.js';

export interface ATMPayload {
  device: string;
  timestamp: string | number;
  values: {
    pm1?: number;
    pm25?: number;
    pm10?: number;
    latitude?: number;
    longitude?: number;
    temperature?: number;
    humidity?: number;
  };
}

const SENSOR_MAPPING: Record<string, { idSensor: string; token: string }> = {
  "PMScan3376DF": {
    idSensor: "PMScan3376DF",
    token: "674ltxwo470i2se5dma8gdgaiszl24sp"
  }
};

export async function postToATM(payload: ATMPayload): Promise<boolean> {
  try {
    const sensorInfo = SENSOR_MAPPING[payload.device];
    if (!sensorInfo) {
      logger.warn(`⚠️ Device ${payload.device} not mapped, skipping.`);
      return false;
    }

    const atmPayload = {
      idSensor: sensorInfo.idSensor,
      time: new Date(payload.timestamp).getTime(), // timestamp en ms (number)
      data: {
        ...(payload.values.pm1 !== undefined && { pm1: { value: payload.values.pm1, unit: "ugm3" } }),
        ...(payload.values.pm25 !== undefined && { pm25: { value: payload.values.pm25, unit: "ugm3" } }),
        ...(payload.values.pm10 !== undefined && { pm10: { value: payload.values.pm10, unit: "ugm3" } }),
        ...(payload.values.temperature !== undefined && { temperature: { value: payload.values.temperature, unit: "c" } }),
        ...(payload.values.humidity !== undefined && { humidity: { value: payload.values.humidity, unit: "percent" } }),
        ...(payload.values.latitude !== undefined && { latitude: { value: payload.values.latitude, unit: "degrees" } }),
        ...(payload.values.longitude !== undefined && { longitude: { value: payload.values.longitude, unit: "degrees" } }),
      }
    };

    logger.info(`📤 Posting to ATM API: idSensor=${atmPayload.idSensor} at ${atmPayload.time}`);
    logger.debug(`[DEBUG] POST body => ${JSON.stringify(atmPayload)}`);

    const response = await fetch(config.dashboard.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sensorInfo.token}`
      },
      body: JSON.stringify(atmPayload)
    });

    if (response.ok) {
      logger.info(`✅ Successfully posted to ATM API (${response.status})`);
      return true;
    } else {
      const errorText = await response.text();
      logger.error(`❌ ATM API returned error ${response.status}: ${errorText}`);
      return false;
    }
  } catch (error) {
    logger.error('❌ Network error posting to ATM API:', error);
    return false;
  }
}
