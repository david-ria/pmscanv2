// src/poster.ts
import { config } from './config.js';
import { logger } from './logger.js';

export interface ATMPayload {
  device: string;       // internal field (will be mapped to idSensor)
  timestamp: string;    // internal field (will be mapped to time, ISO 8601)
  values: {
    pm1?: number;
    pm25?: number;
    pm10?: number;
    latitude?: number;
    longitude?: number;
  };
  units?: {
    pm1?: string;
    pm25?: string;
    pm10?: string;
    latitude?: string;
    longitude?: string;
  };
}

// ATM API expected shape
type ATMApiPayload = {
  idSensor: string;     // device identifier (string or number as string)
  time: string;         // ISO 8601 date-time
  data: Record<string, number>; // non-empty object of numeric fields
};

function toISOorThrow(ts: string): string {
  const d = new Date(ts);
  const iso = d.toISOString();
  if (iso === 'Invalid Date') {
    throw new Error(`Invalid timestamp '${ts}' – must be ISO 8601 or Unix ms`);
  }
  return iso;
}

function buildApiPayload(payload: ATMPayload): ATMApiPayload {
  const data: Record<string, number> = {};

  if (payload.values.pm1 !== undefined) data.pm1 = payload.values.pm1;
  if (payload.values.pm25 !== undefined) data.pm25 = payload.values.pm25;
  if (payload.values.pm10 !== undefined) data.pm10 = payload.values.pm10;
  if (payload.values.latitude !== undefined) data.latitude = payload.values.latitude;
  if (payload.values.longitude !== undefined) data.longitude = payload.values.longitude;

  if (Object.keys(data).length === 0) {
    throw new Error('ATM API payload requires a non-empty "data" object');
  }

  return {
    idSensor: String(payload.device),
    time: toISOorThrow(payload.timestamp),
    data,
  };
}

export async function postToATM(payload: ATMPayload): Promise<boolean> {
  try {
    const apiPayload = buildApiPayload(payload);
    logger.info(`📤 Posting to ATM API: idSensor=${apiPayload.idSensor} at ${apiPayload.time}`);
    logger.info('[DEBUG] POST body => ' + JSON.stringify(apiPayload));

    const response = await fetch(config.dashboard.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.dashboard.bearer}`,
      },
      body: JSON.stringify(apiPayload),
    });

    if (response.ok) {
      logger.info(`✅ Successfully posted to ATM API (${response.status})`);
      return true;
    }

    const errorText = await response.text();
    logger.error(`❌ ATM API returned error ${response.status}: ${errorText}`);
    return false;
  } catch (error: any) {
    logger.error(`❌ Failed to build or post ATM payload: ${error?.message ?? error}`);
    return false;
  }
}
