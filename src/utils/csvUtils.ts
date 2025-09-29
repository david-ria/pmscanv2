/**
 * Pure CSV utility functions for testing and data export
 * No external dependencies, uses only native JavaScript
 */

export interface MeasurementRecord {
  mission_id: string;
  timestamp: Date | string;
  pm1: number;
  pm25: number;
  pm10: number;
  latitude?: number;
  longitude?: number;
  activity?: string;
}

/**
 * Converts a Date to ISO 8601 UTC format (YYYY-MM-DDTHH:mm:ss.sssZ)
 */
export function formatTimestampISO(timestamp: Date | string): string {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  return date.toISOString();
}

/**
 * Escapes CSV field values according to RFC 4180
 * - Wrap in quotes if contains comma, quote, or newline
 * - Escape quotes by doubling them
 */
export function escapeCSVField(value: string | number | undefined | null): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  const stringValue = String(value);
  
  // If field contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
}

/**
 * Generates CSV content from measurement records with exact header contract
 * Headers (order matters): mission_id,timestamp_iso,pm1,pm2_5,pm10,lat,lon,activity
 */
export function generateMeasurementCSV(measurements: MeasurementRecord[]): string {
  // Exact header order as specified in contract
  const headers = ['mission_id', 'timestamp_iso', 'pm1', 'pm2_5', 'pm10', 'lat', 'lon', 'activity'];
  
  // Generate header row
  const headerRow = headers.join(',');
  
  // Generate data rows
  const dataRows = measurements.map(measurement => {
    const row = [
      escapeCSVField(measurement.mission_id),
      escapeCSVField(formatTimestampISO(measurement.timestamp)),
      escapeCSVField(measurement.pm1),
      escapeCSVField(measurement.pm25), // Note: pm25 maps to pm2_5 header
      escapeCSVField(measurement.pm10),
      escapeCSVField(measurement.latitude || ''),
      escapeCSVField(measurement.longitude || ''),
      escapeCSVField(measurement.activity || '')
    ];
    return row.join(',');
  });
  
  return [headerRow, ...dataRows].join('\n');
}

/**
 * Validates CSV header order matches the exact contract
 */
export function validateCSVHeaders(csvContent: string): boolean {
  const lines = csvContent.split('\n');
  if (lines.length === 0) return false;
  
  const actualHeaders = lines[0];
  const expectedHeaders = 'mission_id,timestamp_iso,pm1,pm2_5,pm10,lat,lon,activity';
  
  return actualHeaders === expectedHeaders;
}

/**
 * Parses CSV content and returns the headers as an array
 */
export function parseCSVHeaders(csvContent: string): string[] {
  const lines = csvContent.split('\n');
  if (lines.length === 0) return [];
  
  return lines[0].split(',').map(header => header.trim().replace(/^"(.*)"$/, '$1'));
}