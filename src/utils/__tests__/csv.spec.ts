import { describe, test, expect } from 'vitest';
import {
  generateMeasurementCSV,
  formatTimestampISO,
  escapeCSVField,
  validateCSVHeaders,
  parseCSVHeaders,
  type MeasurementRecord
} from '../csvUtils';

describe('CSV Export Contract', () => {
  describe('Header Order Validation', () => {
    test('should generate exact headers in correct order', () => {
      const measurements: MeasurementRecord[] = [{
        mission_id: 'test-mission',
        timestamp: new Date('2024-01-15T10:30:00.000Z'),
        pm1: 15.5,
        pm25: 25.8,
        pm10: 45.2
      }];

      const csv = generateMeasurementCSV(measurements);
      const headers = parseCSVHeaders(csv);
      
      expect(headers).toEqual([
        'mission_id',
        'timestamp_iso', 
        'pm1',
        'pm2_5',
        'pm10',
        'lat',
        'lon',
        'activity'
      ]);
    });

    test('should fail validation if header order is wrong', () => {
      // Wrong order CSV
      const wrongOrderCSV = 'timestamp_iso,mission_id,pm1,pm2_5,pm10,lat,lon,activity\n';
      expect(validateCSVHeaders(wrongOrderCSV)).toBe(false);
      
      // Correct order CSV
      const correctOrderCSV = 'mission_id,timestamp_iso,pm1,pm2_5,pm10,lat,lon,activity\n';
      expect(validateCSVHeaders(correctOrderCSV)).toBe(true);
    });

    test('should fail validation if headers are missing', () => {
      const incompleteCSV = 'mission_id,timestamp_iso,pm1\n';
      expect(validateCSVHeaders(incompleteCSV)).toBe(false);
    });

    test('should fail validation if extra headers are present', () => {
      const extraHeadersCSV = 'mission_id,timestamp_iso,pm1,pm2_5,pm10,lat,lon,activity,extra_field\n';
      expect(validateCSVHeaders(extraHeadersCSV)).toBe(false);
    });
  });

  describe('ISO 8601 UTC Timestamp Formatting', () => {
    test('should format Date objects as ISO 8601 UTC', () => {
      const date = new Date('2024-01-15T10:30:45.123Z');
      const formatted = formatTimestampISO(date);
      
      expect(formatted).toBe('2024-01-15T10:30:45.123Z');
      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    test('should format string timestamps as ISO 8601 UTC', () => {
      const timestamp = '2024-01-15T10:30:45.123Z';
      const formatted = formatTimestampISO(timestamp);
      
      expect(formatted).toBe('2024-01-15T10:30:45.123Z');
    });

    test('should handle different timezone inputs and convert to UTC', () => {
      const localTime = new Date('2024-01-15T10:30:45.123');
      const formatted = formatTimestampISO(localTime);
      
      // Should end with Z (UTC indicator)
      expect(formatted).toMatch(/Z$/);
      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    test('should fail if timestamp format deviates from ISO 8601', () => {
      const measurements: MeasurementRecord[] = [{
        mission_id: 'test',
        timestamp: new Date('2024-01-15T10:30:45.123Z'),
        pm1: 15,
        pm25: 25,
        pm10: 45
      }];

      const csv = generateMeasurementCSV(measurements);
      const lines = csv.split('\n');
      const dataRow = lines[1].split(',');
      const timestampField = dataRow[1]; // timestamp_iso is second field
      
      // Should be proper ISO format
      expect(timestampField).toBe('2024-01-15T10:30:45.123Z');
      
      // Should NOT be other common formats
      expect(timestampField).not.toMatch(/^\d{2}\/\d{2}\/\d{4}/); // MM/DD/YYYY
      expect(timestampField).not.toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/); // YYYY-MM-DD HH:mm:ss
      expect(timestampField).not.toMatch(/^\d{4}\/\d{2}\/\d{2}/); // YYYY/MM/DD
    });
  });

  describe('CSV Escaping', () => {
    test('should escape commas in activity field', () => {
      const activity = 'Walking, outdoor exercise';
      const escaped = escapeCSVField(activity);
      
      expect(escaped).toBe('"Walking, outdoor exercise"');
    });

    test('should escape quotes in activity field', () => {
      const activity = 'Indoor "office" work';
      const escaped = escapeCSVField(activity);
      
      expect(escaped).toBe('"Indoor ""office"" work"');
    });

    test('should escape newlines in activity field', () => {
      const activity = 'Multi-line\nactivity description';
      const escaped = escapeCSVField(activity);
      
      expect(escaped).toBe('"Multi-line\nactivity description"');
    });

    test('should handle complex escaping scenarios', () => {
      const activity = 'Complex, "quoted" activity\nwith newlines';
      const escaped = escapeCSVField(activity);
      
      expect(escaped).toBe('"Complex, ""quoted"" activity\nwith newlines"');
    });

    test('should not escape simple strings', () => {
      const activity = 'SimpleActivity';
      const escaped = escapeCSVField(activity);
      
      expect(escaped).toBe('SimpleActivity');
    });

    test('should handle null and undefined values', () => {
      expect(escapeCSVField(null)).toBe('');
      expect(escapeCSVField(undefined)).toBe('');
    });
  });

  describe('Complete CSV Generation', () => {
    test('should generate correct CSV for multiple measurements', () => {
      const measurements: MeasurementRecord[] = [
        {
          mission_id: 'mission-001',
          timestamp: new Date('2024-01-15T10:30:00.000Z'),
          pm1: 15.5,
          pm25: 25.8,
          pm10: 45.2,
          latitude: 48.8566,
          longitude: 2.3522,
          activity: 'Walking'
        },
        {
          mission_id: 'mission-001',
          timestamp: new Date('2024-01-15T10:31:00.000Z'),
          pm1: 16.2,
          pm25: 26.5,
          pm10: 46.1,
          latitude: 48.8567,
          longitude: 2.3523,
          activity: 'Outdoor, exercise'
        }
      ];

      const csv = generateMeasurementCSV(measurements);
      const expectedCSV = [
        'mission_id,timestamp_iso,pm1,pm2_5,pm10,lat,lon,activity',
        'mission-001,2024-01-15T10:30:00.000Z,15.5,25.8,45.2,48.8566,2.3522,Walking',
        'mission-001,2024-01-15T10:31:00.000Z,16.2,26.5,46.1,48.8567,2.3523,"Outdoor, exercise"'
      ].join('\n');

      expect(csv).toBe(expectedCSV);
    });

    test('should handle measurements with missing optional fields', () => {
      const measurements: MeasurementRecord[] = [{
        mission_id: 'mission-002',
        timestamp: new Date('2024-01-15T10:30:00.000Z'),
        pm1: 15.5,
        pm25: 25.8,
        pm10: 45.2
        // No latitude, longitude, or activity
      }];

      const csv = generateMeasurementCSV(measurements);
      const lines = csv.split('\n');
      
      expect(lines).toHaveLength(2); // Header + 1 data row
      expect(lines[1]).toBe('mission-002,2024-01-15T10:30:00.000Z,15.5,25.8,45.2,,,');
    });

    test('should validate complete CSV structure', () => {
      const measurements: MeasurementRecord[] = [{
        mission_id: 'test-mission',
        timestamp: new Date('2024-01-15T10:30:00.000Z'),
        pm1: 15.5,
        pm25: 25.8,
        pm10: 45.2
      }];

      const csv = generateMeasurementCSV(measurements);
      
      // Should have exactly 2 lines (header + 1 data row)
      const lines = csv.split('\n');
      expect(lines).toHaveLength(2);
      
      // Header should be valid
      expect(validateCSVHeaders(csv)).toBe(true);
      
      // Data row should have correct number of fields
      const dataFields = lines[1].split(',');
      expect(dataFields).toHaveLength(8);
      
      // Mission ID should be first field
      expect(dataFields[0]).toBe('test-mission');
      
      // Timestamp should be second field in ISO format
      expect(dataFields[1]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle empty measurements array', () => {
      const csv = generateMeasurementCSV([]);
      expect(csv).toBe('mission_id,timestamp_iso,pm1,pm2_5,pm10,lat,lon,activity');
      expect(validateCSVHeaders(csv)).toBe(true);
    });

    test('should handle zero values correctly', () => {
      const measurements: MeasurementRecord[] = [{
        mission_id: 'zero-test',
        timestamp: new Date('2024-01-15T10:30:00.000Z'),
        pm1: 0,
        pm25: 0,
        pm10: 0,
        latitude: 0,
        longitude: 0
      }];

      const csv = generateMeasurementCSV(measurements);
      const lines = csv.split('\n');
      expect(lines[1]).toContain(',0,0,0,0,0,');
    });

    test('should handle negative coordinates', () => {
      const measurements: MeasurementRecord[] = [{
        mission_id: 'negative-coords',
        timestamp: new Date('2024-01-15T10:30:00.000Z'),
        pm1: 15,
        pm25: 25,
        pm10: 45,
        latitude: -33.8688,
        longitude: -151.2093
      }];

      const csv = generateMeasurementCSV(measurements);
      const lines = csv.split('\n');
      expect(lines[1]).toContain(',-33.8688,-151.2093,');
    });
  });
});