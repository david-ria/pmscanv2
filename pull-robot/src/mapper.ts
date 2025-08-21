import { readFile } from 'fs/promises';
import { parse } from 'csv-parse/sync';
import { config } from './config.js';
import { createLogger } from './logger.js';
import { SensorMappingSchema, type SensorMapping } from './types.js';

const logger = createLogger('mapper');

let sensorMapping: Map<string, number> | null = null;

// Load sensor mapping from CSV file
export async function loadSensorMapping(): Promise<Map<string, number>> {
  if (sensorMapping) {
    return sensorMapping;
  }
  
  try {
    logger.info('Loading sensor mapping from:', config.sensorMap.path);
    
    const csvContent = await readFile(config.sensorMap.path, 'utf-8');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
    
    sensorMapping = new Map();
    
    for (const record of records) {
      try {
        // Validate record structure
        const mapping = SensorMappingSchema.parse(record);
        sensorMapping.set(mapping.device_id, mapping.idSensor);
        
        logger.debug('Loaded sensor mapping:', mapping);
      } catch (error) {
        logger.warn('Invalid sensor mapping record:', { record, error });
      }
    }
    
    logger.info(`Loaded ${sensorMapping.size} sensor mappings`);
    return sensorMapping;
    
  } catch (error) {
    logger.error('Failed to load sensor mapping:', error);
    
    // Create empty mapping to prevent repeated failures
    sensorMapping = new Map();
    return sensorMapping;
  }
}

// Get sensor ID for a device
export function getSensorId(deviceId: string): number | null {
  if (!sensorMapping) {
    logger.warn('Sensor mapping not loaded, call loadSensorMapping() first');
    return null;
  }
  
  const sensorId = sensorMapping.get(deviceId);
  if (!sensorId) {
    logger.warn('No sensor mapping found for device:', deviceId);
    return null;
  }
  
  return sensorId;
}

// Refresh sensor mapping (useful for hot-reload without restart)
export async function refreshSensorMapping(): Promise<Map<string, number>> {
  logger.info('Refreshing sensor mapping...');
  sensorMapping = null;
  return loadSensorMapping();
}

// Validate if device has sensor mapping
export function hasDeviceMapping(deviceId: string): boolean {
  return !!getSensorId(deviceId);
}

// Get all mapped device IDs
export function getMappedDeviceIds(): string[] {
  if (!sensorMapping) {
    return [];
  }
  
  return Array.from(sensorMapping.keys());
}

// Get mapping statistics
export function getMappingStats(): { totalMappings: number; deviceIds: string[] } {
  if (!sensorMapping) {
    return { totalMappings: 0, deviceIds: [] };
  }
  
  return {
    totalMappings: sensorMapping.size,
    deviceIds: Array.from(sensorMapping.keys()),
  };
}