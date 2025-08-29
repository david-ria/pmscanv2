// src/poster.ts
import { config } from './config.js';
import { logger } from './logger.js';

export interface ATMPayload {
  device: string;       // interne -> idSensor
  timestamp: string;    // interne -> time (epoch ms)
  values: {
    pm1?: number;
    pm25?: number;
    pm10?: number;
    latitude?: number;
    longitude?: number;
    temperature?: number; // optionnel (°C)
    humidity?: number;    // optionnel (%)
  };
  units?: {
    pm1?: string;       // normalisé en "ugm3"/"mgm3"
    pm25?: string;
    pm10?: string;
    temperature?: string; // "c"
    humidity?: string;    // "percent"
  };
}

type ATMApiPayload = {
  idSensor: string | number;
  time: number; // epoch ms
  data: {
    pm1?:        { value: number; unit: 'ugm3' | 'mgm3' };
    pm25?:       { value: number; unit: 'ugm3' | 'mgm3' };
    pm10?:       { value: number; unit: 'ugm3' | 'mgm3' };
    temperature?:{ value: number; unit: 'c' };
    humidity?:   { value: number; unit: 'percent' };
    latitude?:   { value: number; unit: 'degrees' };
    longitude?:  { value: number; unit: 'degrees' };
  };
};

function toEpochMsOrThrow(ts: string): number {
  const ms = new Date(ts).getTime();
  if (!Number.isFinite(ms) || ms <= 0) {
    throw new Error(`Invalid timestamp '${ts}' – expected ISO string convertible to epoch ms`);
  }
  return ms;
}

/** Normalise strict → "ugm3" | "mgm3" (API n’accepte que ces tokens) */
function normalizePmUnit(u?: string): 'ugm3' | 'mgm3' {
  if (!u) return 'ugm3';
  const s = u.toLowerCase().replace(/\s+/g, '');
  if (
    s === 'µg/m³' || s === 'µg/m3' ||
    s === 'ug/m³' || s === 'ug/m3' ||
    s === 'ugm3'  || s === 'microgramperm3' || s === 'microgramsperm3'
  ) return 'ugm3';
  if (s === 'mg/m3' || s === 'mg/m³' || s === 'mgm3' || s === 'milligramperm3') return 'mgm3';
  return 'ugm3';
}

/** Temp & RH : l’API attend "c" et "percent" */
function normalizeTempUnit(u?: string): 'c' {
  return 'c';
}
function normalizeHumidityUnit(u?: string): 'percent' {
  return 'percent';
}

/** Lat/Lon : l’API attend "degrees" */
function geoUnit(): 'degrees' {
  return 'degrees';
}

function buildApiPayload(payload: ATMPayload): ATMApiPayload {
  const data: ATMApiPayload['data'] = {};

  if (payload.values.pm1  !== undefined) data.pm1  = { value: payload.values.pm1,  unit: normalizePmUnit(payload.units?.pm1) };
  if (payload.values.pm25 !== undefined) data.pm25 = { value: payload.values.pm25, unit: normalizePmUnit(payload.units?.pm25) };
  if (payload.values.pm10 !== undefined) data.pm10 = { value: payload.values.pm10, unit: normalizePmUnit(payload.units?.pm10) };

  if (payload.values.temperature !== undefined) {
    data.temperature = { value: payload.values.temperature, unit: normalizeTempUnit(payload.units?.temperature) };
  }
  if (payload.values.humidity !== undefined) {
    data.humidity = { value: payload.values.humidity, unit: normalizeHumidityUnit(payload.units?.humidity) };
  }

  if (payload.values.latitude  !== undefined) data.latitude  = { value: payload.values.latitude,  unit: geoUnit() };
  if (payload.values.longitude !== undefined) data.longitude = { value: payload.values.longitude, unit: geoUnit() };

  // l’API demande au moins un champ dans data
  if (Object.keys(data).length === 0) {
    throw new Error('ATM API payload requires a non-empty "data" object.');
  }

  return {
    idSensor: String(payload.device),
    time: toEpochMsOrThrow(payload.timestamp),
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
