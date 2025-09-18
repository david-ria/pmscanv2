// PMScan packet validation constants and utilities

export interface PacketValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}

// Protocol constants
export const PACKET_MIN_LENGTH = 18; // Minimum bytes for basic PM data
export const PARTICLE_DATA_START = 128;
export const PARTICLE_DATA_LENGTH = 10;
export const EXTERNAL_SENSOR_START = 145;
export const EXTERNAL_SENSOR_LENGTH = 2;

// Value validation ranges
export const VALIDATION_RANGES = {
  PM_MAX: 1000, // µg/m³ - anything above is likely corrupted
  PM_MIN: 0,
  TEMP_MAX: 60, // °C - reasonable indoor/outdoor range
  TEMP_MIN: -20, // °C
  HUMIDITY_MAX: 100, // %
  HUMIDITY_MIN: 0, // %
  BATTERY_MAX: 100, // %
  BATTERY_MIN: 0, // %
  PARTICLES_MAX: 100000, // particles/L - upper bound for particle counts
} as const;

/**
 * Validates PMScan packet before parsing
 */
export function validatePMScanPacket(rawData: Uint8Array): PacketValidationResult {
  const warnings: string[] = [];
  
  // Check minimum length
  if (rawData.length < PACKET_MIN_LENGTH) {
    return {
      isValid: false,
      error: `Packet too short: ${rawData.length} bytes (minimum ${PACKET_MIN_LENGTH})`
    };
  }

  // Basic integrity check - ensure we have valid data structure
  if (!rawData || rawData.length === 0) {
    return {
      isValid: false,
      error: 'Empty or invalid packet data'
    };
  }

  // Check for all-zero data (potential corruption indicator)
  const nonZeroBytes = rawData.slice(8, 18).some(byte => byte !== 0);
  if (!nonZeroBytes) {
    warnings.push('Packet contains mostly zero data - possible corruption');
  }

  return {
    isValid: true,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

/**
 * Validates parsed PM values for reasonable ranges
 */
export function validatePMValues(
  pm1: number, 
  pm25: number, 
  pm10: number, 
  temp: number, 
  humidity: number
): PacketValidationResult {
  const warnings: string[] = [];

  // Check for truly corrupt data (NaN, Infinity, null, undefined)
  if (!Number.isFinite(pm1) || !Number.isFinite(pm25) || !Number.isFinite(pm10) || 
      !Number.isFinite(temp) || !Number.isFinite(humidity)) {
    return {
      isValid: false,
      error: 'Corrupt data - non-finite values detected'
    };
  }

  // PM value validation - add warnings but don't reject
  if (pm1 < VALIDATION_RANGES.PM_MIN || pm1 > VALIDATION_RANGES.PM_MAX) {
    warnings.push(`PM1 out of range: ${pm1} µg/m³`);
  }
  if (pm25 < VALIDATION_RANGES.PM_MIN || pm25 > VALIDATION_RANGES.PM_MAX) {
    warnings.push(`PM2.5 out of range: ${pm25} µg/m³`);
  }
  if (pm10 < VALIDATION_RANGES.PM_MIN || pm10 > VALIDATION_RANGES.PM_MAX) {
    warnings.push(`PM10 out of range: ${pm10} µg/m³`);
  }

  // Temperature validation - add warnings but don't reject
  if (temp < VALIDATION_RANGES.TEMP_MIN || temp > VALIDATION_RANGES.TEMP_MAX) {
    warnings.push(`Temperature out of range: ${temp}°C`);
  }

  // Humidity validation - add warnings but don't reject
  if (humidity < VALIDATION_RANGES.HUMIDITY_MIN || humidity > VALIDATION_RANGES.HUMIDITY_MAX) {
    warnings.push(`Humidity out of range: ${humidity}%`);
  }

  // Physical consistency checks - add warnings but don't reject
  if (pm1 > pm25) {
    warnings.push('PM1 > PM2.5 - physically inconsistent');
  }
  if (pm25 > pm10) {
    warnings.push('PM2.5 > PM10 - physically inconsistent');
  }

  return {
    isValid: true, // Always valid unless data is truly corrupt
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

/**
 * Validates particle count values
 */
export function validateParticleData(particles: number[]): PacketValidationResult {
  const warnings: string[] = [];

  particles.forEach((count, index) => {
    if (count < 0 || count > VALIDATION_RANGES.PARTICLES_MAX) {
      warnings.push(`Particle count ${index} out of range: ${count} particles/L`);
    }
  });

  return {
    isValid: warnings.length === 0,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}