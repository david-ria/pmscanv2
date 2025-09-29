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

  // Enforce allow-list if configured (case-insensitive)
  if (config.deviceResolution.allowList && !config.deviceResolution.allowList.map(id => id.toLowerCase()).includes(deviceId.toLowerCase())) {
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
    deviceId,                                   // non-null
    source,                                     // 'filename' | 'csv_header' | 'sensor_map'
    shouldSkip: false,
    skipReason: null as const                   // <-- ensure explicit null
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
  if (!csvContent) return null;

  // A) Free-form lines: "Device: PMScan123", "DeviceID=PMScan456"
  const inlineRe = /device[_\s-]*(?:id)?[\s:=,]+([A-Za-z0-9_-]+)/i;
  const inlineMatch = csvContent.match(inlineRe);
  if (inlineMatch?.[1]) return inlineMatch[1].trim();

  // B) Header-based detection (first non-empty line)
  const lines = csvContent.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (!lines.length) return null;

  const header = lines[0].split(/[,\t;]/).map(s => s.trim());
  const data   = (lines[1] || '').split(/[,\t;]/).map(s => s.trim());

  const headerIdx = header.findIndex(h => /^(device(_|-)?id?|device)$/i.test(h));
  if (headerIdx >= 0 && data[headerIdx] && data[headerIdx].length <= 64) {
    return data[headerIdx];
  }

  return null;
}

/**
 * Check if device ID is in allow-list (if configured)
 */
export function isDeviceAllowed(deviceId: string): boolean {
  const allowList = config.deviceResolution.allowList;
  if (!allowList) {
    return true; // No allow-list configured, all devices allowed
  }
  
  return allowList.map(id => id.toLowerCase()).includes(deviceId.toLowerCase());
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