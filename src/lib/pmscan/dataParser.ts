import { PMScanData, PMScanInternalState } from './types';
import { DT_2000 } from './constants';
import { createTimestamp } from '@/utils/timeFormat';
import { 
  validatePMScanPacket, 
  validatePMValues, 
  validateParticleData,
  PACKET_MIN_LENGTH,
  PARTICLE_DATA_START,
  EXTERNAL_SENSOR_START 
} from './validation';
import * as logger from '@/utils/logger';

export function parsePMScanDataPayload(
  charValue: DataView,
  pmScanState: PMScanInternalState
): PMScanData | null {
  try {
    const rawData = new Uint8Array(charValue.buffer);
    
    // Step 1: Validate packet integrity
    const packetValidation = validatePMScanPacket(rawData);
    if (!packetValidation.isValid) {
      logger.error('📦 Invalid packet:', new Error(packetValidation.error));
      return null;
    }
    
    if (packetValidation.warnings) {
      packetValidation.warnings.forEach(warning => {
        logger.warn('📦 Packet warning:', warning);
      });
    }

    // Step 2: Parse core data using proper DataView methods
    const dataView = new DataView(rawData.buffer);
    
    // Parse timestamp (little-endian)
    const ts2000 = dataView.getUint32(0, true);
    
    // Parse PM values (little-endian, scale by /10)
    const pm1 = dataView.getUint16(8, true) / 10;
    const pm25 = dataView.getUint16(10, true) / 10;
    const pm10 = dataView.getUint16(12, true) / 10;
    const temp = dataView.getUint16(14, true) / 10;
    const humidity = dataView.getUint16(16, true) / 10;

    // Step 3: Validate parsed values
    const valueValidation = validatePMValues(pm1, pm25, pm10, temp, humidity);
    if (valueValidation.warnings) {
      valueValidation.warnings.forEach(warning => {
        logger.warn('📊 Value warning:', warning);
      });
    }

    // If values are severely out of range, reject packet
    if (!valueValidation.isValid) {
      logger.error('📊 Invalid values in packet - rejecting');
      return null;
    }

    const data: PMScanData = {
      pm1,
      pm25,
      pm10,
      temp,
      humidity,
      battery: pmScanState.battery,
      charging: pmScanState.charging === 1,
      timestamp: createTimestamp(), // Single source: smartphone time for consistency
      location: 'PMScan Device',
    };

    // Step 4: Parse optional particle count data (bytes 128-137)
    if (rawData.length > PARTICLE_DATA_START + 9) { // Need at least 10 bytes for particle data
      try {
        const particles = [
          dataView.getUint16(128, true), // 0.2µm to 0.5µm
          dataView.getUint16(130, true), // 0.5µm to 1.0µm
          dataView.getUint16(132, true), // 1.0µm to 2.5µm
          dataView.getUint16(134, true), // 2.5µm to 5.0µm
          dataView.getUint16(136, true), // 5.0µm to 10.0µm
        ];

        const particleValidation = validateParticleData(particles);
        if (particleValidation.warnings) {
          particleValidation.warnings.forEach(warning => {
            logger.warn('🔬 Particle data warning:', warning);
          });
        }

        if (particleValidation.isValid) {
          data.particles_02_05 = particles[0];
          data.particles_05_10 = particles[1];
          data.particles_10_25 = particles[2];
          data.particles_25_50 = particles[3];
          data.particles_50_100 = particles[4];
        }
      } catch (error) {
        logger.warn('🔬 Failed to parse particle data:', error);
      }
    }

    // Step 5: Parse optional external sensor data (bytes 145-146)
    if (rawData.length > EXTERNAL_SENSOR_START + 1) { // Need at least 2 bytes for external sensors
      try {
        const extTemp = dataView.getUint8(145) / 100; // External temperature (°C)
        const extHumidity = dataView.getUint8(146) / 100; // External humidity (%)
        
        // Basic validation for external sensors
        if (extTemp >= -40 && extTemp <= 80 && extHumidity >= 0 && extHumidity <= 100) {
          data.external_temperature = extTemp;
          data.external_humidity = extHumidity;
        } else {
          logger.warn('🌡️ External sensor values out of range - skipping');
        }
      } catch (error) {
        logger.warn('🌡️ Failed to parse external sensor data:', error);
      }
    }

    logger.debug('📦 Successfully parsed packet:', {
      pm1: data.pm1,
      pm25: data.pm25,
      pm10: data.pm10,
      temp: data.temp,
      humidity: data.humidity,
      hasParticles: !!(data.particles_02_05),
      hasExternal: !!(data.external_temperature)
    });

    return data;
  } catch (error) {
    logger.error('📦 Critical parsing error:', error);
    return null;
  }
}
