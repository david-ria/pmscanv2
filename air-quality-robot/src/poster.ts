// src/poster.ts
import { config } from './config.js';
import { logger } from './logger.js';

export interface ATMPayload {
  device: string;       // internal field → maps to idSensor
  timestamp: string;    // internal field → maps to time (ISO 8601)
  values: {
    pm1?: number;
    pm25?: number;
    pm10?: number;
    latitude?: number;
    longitude?: number;
  };
  units?: {
    pm1?: string;       // e.g. "ugm3", "µg/m³", "mg/m3"… (normalized below)
    pm25?: string;
    pm10?: string;
  };
}

// ATM API expected top-level shape
type ATMApiPayload = {
  idSensor: string;
  time: string;          // ISO string
  data: {
    pm1?: { value: number; unit: string };
    pm25?: { value: number; unit: string };
    pm10?: { value: number; unit: string };
    latitude?: number;
    longitude?: number;
  };
};

function toISOorThrow(ts: string): string {
  const d = new Date(ts);
  const iso = d.toISOString();
  if (iso === 'Invalid Date') {
    throw new Error(`Invalid timestamp '${ts}' – must be ISO 8601 or Unix ms`);
  }
  return iso;
}

/**
 * Normalize various user/probe-provided notations to the EXACT tokens
 * the ATM API accepts: "ugm3" (micrograms/m³) or "mgm3" (milligrams/m³).
 * Defaults to "ugm3" if nothing/unknown is provided.
 */
function normalizeUnit(u?: string): string {
  if (!u) return 'ugm3';
  const s = u.toLowerCase().replace(/\s+/g, '');

  // map common microgram variants -> "ugm3"
  if (
    s === 'µg/m³' || s === 'µg/m3' ||
    s === 'ug/m³' || s === 'ug/m3' ||
    s === 'ugm3'  || s === 'microgramperm3' || s === 'microgramsperm3'
  ) return 'ugm3';

  // map common milligram variants -> "mgm3"
  if (s === 'mg/m3' || s === 'mg/m³' || s === 'mgm3' || s === 'milligramperm3')
    return 'mgm3';

  // default
  return 'ugm3';
}

function buildApiPayload(payload: ATMPayload): ATMApiPayload {
  const data: ATMApiPayload['data'] = {};

  if (payload.values.pm1 !== undefined) {
    data.pm1 = { value: payload.values.pm1, unit: normalizeUnit(payload.units?.pm1) };
  }
  if (payload.values.pm25 !== undefined) {
    data.pm25 = { value: payload.values.pm25, unit: normalizeUnit(payload.units?.pm25) };
  }
  if (payload.values.pm10 !== undefined) {
    data.pm10 = { value: payload.values.pm10, unit: normalizeUnit(payload.units?.pm10) };
  }

  // Geo stays as plain numbers unless API later requires {value, unit}
  if (payload.values.latitude !== undefined)  data.latitude  = payload.values.latitude;
  if (payload.values.longitude !== undefined) data.longitude = payload.values.longitude;

  if (!data.pm1 && !data.pm25 && !data.pm10) {
    throw new Error('ATM API payload requires at least one PM field with {value, unit}.');
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
