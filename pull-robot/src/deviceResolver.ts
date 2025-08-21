import { config } from './config.js';
import { createLogger } from './logger.js';
import { getSensorId } from './mapper.js';

const logger = createLogger('device-resolver');

export interface DeviceResolutionResult {
  deviceId: string | null;
  source: 'filename' | 'csv_header' | 'sensor_map' | 'unknown';
  shouldSkip: boolean;
  skipReason?: 'unknown_device' | 'not_in_allow_list';
}

/**
 * Resolves device ID following the (a)→(d) priority order:
 * (a) from filename/path
 * (b) from CSV head (peek first 2KB; headers like device_id, DeviceID, or lines like Device: <id>)
 * (c) from ./data/sensor_map.csv (mapping)  
 * (d) if still unknown → obey UNKNOWN_DEVICE_BEHAVIOR (skip or dlq)
 */
export async function resolveDeviceId(
  filename: string, 
  csvPeekContent: string
): Promise<DeviceResolutionResult> {
  let deviceId: string | null = null;
  let source: DeviceResolutionResult['source'] = 'unknown';

  // (a) Extract from filename/path - priority 1
  deviceId = extractFromFilename(filename);
  if (deviceId) {
    source = 'filename';
    logger.debug('Device ID resolved from filename:', { filename, deviceId, source });
  }

  // (b) Extract from CSV headers/content - priority 2
  if (!deviceId) {
    deviceId = extractFromCSVContent(csvPeekContent);
    if (deviceId) {
      source = 'csv_header';
      logger.debug('Device ID resolved from CSV content:', { filename, deviceId, source });
    }
  }

  // (c) Check sensor mapping - priority 3 (if we have a device ID from above)
  if (deviceId) {
    const sensorId = getSensorId(deviceId);
    if (sensorId !== null) {
      source = 'sensor_map';
      logger.debug('Device ID confirmed in sensor mapping:', { filename, deviceId, sensorId, source });
    }
  }

  // (d) Handle unknown device according to UNKNOWN_DEVICE_BEHAVIOR
  if (!deviceId) {
    const behavior = config.deviceResolution.unknownBehavior;
    logger.warn('Device ID could not be resolved:', { 
      filename, 
      behavior,
      sources_checked: ['filename', 'csv_content', 'sensor_map']
    });

    return {
      deviceId: null,
      source: 'unknown',
      shouldSkip: behavior === 'skip',
      skipReason: 'unknown_device'
    };
  }

  // Enforce allow-list if configured
  if (config.deviceResolution.allowList && !config.deviceResolution.allowList.includes(deviceId)) {
    logger.warn('Device ID not in allow-list, skipping:', { 
      filename, 
      deviceId, 
      source,
      allowList: config.deviceResolution.allowList 
    });

    return {
      deviceId,
      source,
      shouldSkip: true,
      skipReason: 'not_in_allow_list'
    };
  }

  // Success - device ID resolved and allowed
  logger.info('Device ID successfully resolved:', { filename, deviceId, source });
  return {
    deviceId,
    source,
    shouldSkip: false
  };
}

/**
 * Extract device ID from filename pattern "device123_mission_2025-07-30_12-34-45.csv"
 */
function extractFromFilename(filename: string): string | null {
  try {
    // Remove path prefix and .csv extension
    const basename = filename.replace(config.storage.pathPrefix, '').replace('.csv', '');
    const parts = basename.split('_');
    
    if (parts.length > 0) {
      const deviceId = parts[0];
      // Validate device ID format (basic check)
      if (deviceId && deviceId.length > 0 && !deviceId.includes('.')) {
        return deviceId;
      }
    }
    
    return null;
  } catch (error) {
    logger.debug('Error extracting device ID from filename:', { filename, error });
    return null;
  }
}

/**
 * Extract device ID from CSV content (first 2KB)
 * Look for patterns like:
 * - Headers: device_id, DeviceID, Device ID  
 * - Lines: Device: <id>, DeviceID=<id>
 */
function extractFromCSVContent(csvContent: string): string | null {
  try {
    const lines = csvContent.split('\n').slice(0, 10); // Check first 10 lines
    
    for (const line of lines) {
      // Look for device ID in headers (first line typically)
      if (line.toLowerCase().includes('device')) {
        const headerMatch = line.match(/device[_\s]*(?:id)?[,\t]/i);
        if (headerMatch) {
          // If we find device header, look for the value in the same or next line
          const parts = line.split(/[,\t]/);
          const deviceIndex = parts.findIndex(part => /device[_\s]*(?:id)?/i.test(part.trim()));
          if (deviceIndex >= 0 && deviceIndex + 1 < parts.length) {
            const deviceValue = parts[deviceIndex + 1]?.trim();
            if (deviceValue && deviceValue.length > 0) {
              return deviceValue;
            }
          }
        }
      }

      // Look for device ID in metadata lines: "Device: PMScan123" or "DeviceID=PMScan456"
      const deviceMatches = line.match(/device[_\s]*(?:id)?[\s:=]+([a-zA-Z0-9_-]+)/i);
      if (deviceMatches && deviceMatches[1]) {
        const deviceId = deviceMatches[1].trim();
        if (deviceId.length > 0) {
          return deviceId;
        }
      }
      
      // Look for sensor/pmscan patterns
      const sensorMatches = line.match(/([a-zA-Z0-9_-]+).*(?:sensor|pmscan)/i);
      if (sensorMatches && sensorMatches[1]) {
        const deviceId = sensorMatches[1].trim();
        if (deviceId.length > 2) {
          return deviceId;
        }
      }
    }
    
    return null;
  } catch (error) {
    logger.debug('Error extracting device ID from CSV content:', { error });
    return null;
  }
}

/**
 * Check if device ID is in allow-list (if configured)
 */
export function isDeviceAllowed(deviceId: string): boolean {
  const allowList = config.deviceResolution.allowList;
  if (!allowList) {
    return true; // No allow-list configured, all devices allowed
  }
  
  return allowList.includes(deviceId);
}

/**
 * Log example for when a row is skipped due to allow-list
 */
export function logAllowListSkip(filename: string, deviceId: string): void {
  logger.warn('⚠️  ROW SKIPPED: Device not in allow-list', { 
    file: filename,
    device_id: deviceId,
    allow_list: config.deviceResolution.allowList,
    action: 'skip_immediately',
    reason: 'device_not_in_allow_list'
  });
}