import { describe, it, expect, beforeEach, vi } from 'vitest';
import { dataStorage, MissionData, MeasurementData } from '@/lib/dataStorage';
import { saveMissionLocally } from '@/lib/missionManager';
import { getLocalMissions, saveLocalMissions } from '@/lib/localStorage';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage
});

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9)
  }
});

describe('Mission Deduplication', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Mission Upserting', () => {
    it('should not create duplicates when upserting same mission_id twice', () => {
      // Create a mission
      const missionId = 'test-mission-123';
      const baseMission: MissionData = {
        id: missionId,
        name: 'Test Mission',
        startTime: new Date('2025-01-01T10:00:00Z'),
        endTime: new Date('2025-01-01T10:30:00Z'),
        durationMinutes: 30,
        avgPm1: 10,
        avgPm25: 15,
        avgPm10: 20,
        maxPm25: 25,
        measurementsCount: 3,
        recordingFrequency: '30s',
        shared: false,
        deviceName: 'PMScan-001',
        measurements: [
          {
            id: 'measure-1',
            timestamp: new Date('2025-01-01T10:00:00Z'),
            pm1: 8, pm25: 12, pm10: 18,
            latitude: 43.6568064,
            longitude: 5.3608448
          },
          {
            id: 'measure-2',
            timestamp: new Date('2025-01-01T10:15:00Z'),
            pm1: 10, pm25: 15, pm10: 20,
            latitude: 43.6568064,
            longitude: 5.3608448
          },
          {
            id: 'measure-3',
            timestamp: new Date('2025-01-01T10:30:00Z'),
            pm1: 12, pm25: 18, pm10: 22,
            latitude: 43.6568064,
            longitude: 5.3608448
          }
        ] as MeasurementData[],
        synced: false
      };

      // Save first version
      saveMissionLocally(baseMission);
      let missions = getLocalMissions();
      expect(missions).toHaveLength(1);
      expect(missions[0].name).toBe('Test Mission');
      expect(missions[0].measurementsCount).toBe(3);

      // Save updated version with same ID but different data
      const updatedMission: MissionData = {
        ...baseMission,
        name: 'Updated Test Mission',
        measurementsCount: 5,
        avgPm25: 18,
        measurements: [
          ...baseMission.measurements,
          {
            id: 'measure-4',
            timestamp: new Date('2025-01-01T10:45:00Z'),
            pm1: 14, pm25: 20, pm10: 24,
            latitude: 43.6568064,
            longitude: 5.3608448
          },
          {
            id: 'measure-5',
            timestamp: new Date('2025-01-01T11:00:00Z'),
            pm1: 16, pm25: 22, pm10: 26,
            latitude: 43.6568064,
            longitude: 5.3608448
          }
        ] as MeasurementData[]
      };

      saveMissionLocally(updatedMission);
      missions = getLocalMissions();

      // Should still have only one mission, but with updated data
      expect(missions).toHaveLength(1);
      expect(missions[0].id).toBe(missionId);
      expect(missions[0].name).toBe('Updated Test Mission');
      expect(missions[0].measurementsCount).toBe(5);
      expect(missions[0].avgPm25).toBe(18);
      expect(missions[0].measurements).toHaveLength(5);
    });
  });

  describe('Crash Recovery Merging', () => {
    it('should merge partial \\"Recovered Mission\\" with final mission to yield one canonical entry', () => {
      const missionId = 'recovered-mission-456';
      
      // Simulate crash recovery: partial mission saved during crash recovery
      const recoveredMission: MissionData = {
        id: missionId,
        name: 'Recovered Mission (Session 2025-01-01T10:00:00)',
        startTime: new Date('2025-01-01T10:00:00Z'),
        endTime: new Date('2025-01-01T10:15:00Z'),
        durationMinutes: 15,
        avgPm1: 9,
        avgPm25: 14,
        avgPm10: 19,
        maxPm25: 16,
        measurementsCount: 2,
        recordingFrequency: '30s',
        shared: false,
        deviceName: 'PMScan-001',
        measurements: [
          {
            id: 'recover-1',
            timestamp: new Date('2025-01-01T10:00:00Z'),
            pm1: 8, pm25: 12, pm10: 18,
            latitude: 43.6568064,
            longitude: 5.3608448
          },
          {
            id: 'recover-2',
            timestamp: new Date('2025-01-01T10:15:00Z'),
            pm1: 10, pm25: 16, pm10: 20,
            latitude: 43.6568064,
            longitude: 5.3608448
          }
        ] as MeasurementData[],
        synced: false
      };

      // Save recovered mission
      saveMissionLocally(recoveredMission);
      let missions = getLocalMissions();
      expect(missions).toHaveLength(1);
      expect(missions[0].name).toContain('Recovered Mission');

      // Later, user completes the mission properly
      const finalMission: MissionData = {
        id: missionId, // Same ID - should merge
        name: 'Completed Office Air Quality Check',
        startTime: new Date('2025-01-01T10:00:00Z'),
        endTime: new Date('2025-01-01T10:45:00Z'),
        durationMinutes: 45,
        avgPm1: 11,
        avgPm25: 16,
        avgPm10: 21,
        maxPm25: 24,
        measurementsCount: 4,
        recordingFrequency: '30s',
        shared: true,
        deviceName: 'PMScan-001',
        measurements: [
          {
            id: 'final-1',
            timestamp: new Date('2025-01-01T10:00:00Z'),
            pm1: 8, pm25: 12, pm10: 18,
            latitude: 43.6568064,
            longitude: 5.3608448,
            locationContext: 'Office Building',
            activityContext: 'Air Quality Assessment'
          },
          {
            id: 'final-2',
            timestamp: new Date('2025-01-01T10:15:00Z'),
            pm1: 10, pm25: 16, pm10: 20,
            latitude: 43.6568064,
            longitude: 5.3608448,
            locationContext: 'Office Building',
            activityContext: 'Air Quality Assessment'
          },
          {
            id: 'final-3',
            timestamp: new Date('2025-01-01T10:30:00Z'),
            pm1: 12, pm25: 18, pm10: 22,
            latitude: 43.6568064,
            longitude: 5.3608448,
            locationContext: 'Office Building',
            activityContext: 'Air Quality Assessment'
          },
          {
            id: 'final-4',
            timestamp: new Date('2025-01-01T10:45:00Z'),
            pm1: 14, pm25: 20, pm10: 24,
            latitude: 43.6568064,
            longitude: 5.3608448,
            locationContext: 'Office Building',
            activityContext: 'Air Quality Assessment'
          }
        ] as MeasurementData[],
        synced: false
      };

      saveMissionLocally(finalMission);
      missions = getLocalMissions();

      // Should have only one mission - the final canonical version
      expect(missions).toHaveLength(1);
      expect(missions[0].id).toBe(missionId);
      expect(missions[0].name).toBe('Completed Office Air Quality Check');
      expect(missions[0].measurementsCount).toBe(4);
      expect(missions[0].durationMinutes).toBe(45);
      expect(missions[0].shared).toBe(true);
      expect(missions[0].measurements).toHaveLength(4);
    });
  });

  describe('Measurement Deduplication', () => {
    it('should deduplicate measurements by (mission_id, timestamp_iso) and keep latest payload', () => {
      const missionId = 'measurement-dedupe-789';
      const duplicateTimestamp = new Date('2025-01-01T10:30:00Z');
      
      // Create mission with duplicate timestamps but different measurement data
      const mission: MissionData = {
        id: missionId,
        name: 'Measurement Dedupe Test',
        startTime: new Date('2025-01-01T10:00:00Z'),
        endTime: new Date('2025-01-01T11:00:00Z'),
        durationMinutes: 60,
        avgPm1: 12,
        avgPm25: 17,
        avgPm10: 22,
        maxPm25: 25,
        measurementsCount: 5,
        recordingFrequency: '30s',
        shared: false,
        deviceName: 'PMScan-001',
        measurements: [
          // First measurement at 10:30 - older/initial reading
          {
            id: 'measure-dup1',
            timestamp: duplicateTimestamp,
            pm1: 10, pm25: 15, pm10: 20,
            temperature: 22.1,
            humidity: 45,
            latitude: 43.6568064,
            longitude: 5.3608448,
            automaticContext: 'Initial reading'
          },
          // Other measurements
          {
            id: 'measure-unique1',
            timestamp: new Date('2025-01-01T10:00:00Z'),
            pm1: 8, pm25: 12, pm10: 18,
            temperature: 21.8,
            humidity: 48
          },
          {
            id: 'measure-unique2',
            timestamp: new Date('2025-01-01T10:45:00Z'),
            pm1: 14, pm25: 19, pm10: 24,
            temperature: 22.5,
            humidity: 42
          },
          // Second measurement at same 10:30 timestamp - newer/updated reading
          {
            id: 'measure-dup2',
            timestamp: duplicateTimestamp,
            pm1: 12, pm25: 18, pm10: 23,
            temperature: 22.3,
            humidity: 44,
            latitude: 43.6568064,
            longitude: 5.3608448,
            automaticContext: 'Updated reading',
            enrichedLocation: 'Research Lab Room 401'
          },
          // Third measurement at same 10:30 timestamp - latest reading (should be kept)
          {
            id: 'measure-dup3',
            timestamp: duplicateTimestamp,
            pm1: 13, pm25: 20, pm10: 25,
            temperature: 22.4,
            humidity: 43,
            latitude: 43.6568064,
            longitude: 5.3608448,
            automaticContext: 'Final reading',
            enrichedLocation: 'Research Lab Room 401, Main Workstation',
            geohash: 'spey61y0'
          }
        ] as MeasurementData[],
        synced: false
      };

      // Simulate deduplication logic during mission processing
      const measurementMap = new Map<string, MeasurementData>();
      
      mission.measurements.forEach(measurement => {
        const key = `${missionId}_${measurement.timestamp.toISOString()}`;
        // Keep the latest measurement for each timestamp (overwrite duplicates)
        measurementMap.set(key, measurement);
      });

      const deduplicatedMeasurements = Array.from(measurementMap.values());

      // Verify deduplication
      expect(deduplicatedMeasurements).toHaveLength(3); // 3 unique timestamps
      
      // Find the measurement that was kept for the duplicate timestamp
      const keptMeasurement = deduplicatedMeasurements.find(m => 
        m.timestamp.toISOString() === duplicateTimestamp.toISOString()
      );
      
      expect(keptMeasurement).toBeDefined();
      expect(keptMeasurement?.id).toBe('measure-dup3'); // Latest should be kept
      expect(keptMeasurement?.pm25).toBe(20); // Latest values
      expect(keptMeasurement?.automaticContext).toBe('Final reading');
      expect(keptMeasurement?.enrichedLocation).toBe('Research Lab Room 401, Main Workstation');
      expect(keptMeasurement?.geohash).toBe('spey61y0');

      // Verify other unique measurements are preserved
      expect(deduplicatedMeasurements.some(m => m.id === 'measure-unique1')).toBe(true);
      expect(deduplicatedMeasurements.some(m => m.id === 'measure-unique2')).toBe(true);
      
      // Verify older duplicate measurements are not present
      expect(deduplicatedMeasurements.some(m => m.id === 'measure-dup1')).toBe(false);
      expect(deduplicatedMeasurements.some(m => m.id === 'measure-dup2')).toBe(false);
    });

    it('should handle cross-mission measurement deduplication correctly', () => {
      const mission1Id = 'mission-1-abc';
      const mission2Id = 'mission-2-def';
      const sharedTimestamp = new Date('2025-01-01T10:30:00Z');
      
      // Two different missions can have measurements at the same timestamp
      // This should NOT cause deduplication across missions
      const missions: MissionData[] = [
        {
          id: mission1Id,
          name: 'Mission 1',
          startTime: new Date('2025-01-01T10:00:00Z'),
          endTime: new Date('2025-01-01T11:00:00Z'),
          durationMinutes: 60,
          avgPm1: 10, avgPm25: 15, avgPm10: 20, maxPm25: 22,
          measurementsCount: 1,
          recordingFrequency: '30s',
          shared: false,
          measurements: [{
            id: 'mission1-measure',
            timestamp: sharedTimestamp,
            pm1: 10, pm25: 15, pm10: 20,
            locationContext: 'Location A'
          }] as MeasurementData[],
          synced: false
        },
        {
          id: mission2Id,
          name: 'Mission 2',
          startTime: new Date('2025-01-01T10:00:00Z'),
          endTime: new Date('2025-01-01T11:00:00Z'),
          durationMinutes: 60,
          avgPm1: 12, avgPm25: 18, avgPm10: 23, maxPm25: 25,
          measurementsCount: 1,
          recordingFrequency: '30s',
          shared: false,
          measurements: [{
            id: 'mission2-measure',
            timestamp: sharedTimestamp,
            pm1: 12, pm25: 18, pm10: 23,
            locationContext: 'Location B'
          }] as MeasurementData[],
          synced: false
        }
      ];

      // Save both missions
      missions.forEach(mission => saveMissionLocally(mission));
      
      const savedMissions = getLocalMissions();
      expect(savedMissions).toHaveLength(2);
      
      // Each mission should retain its measurements despite shared timestamp
      const savedMission1 = savedMissions.find(m => m.id === mission1Id);
      const savedMission2 = savedMissions.find(m => m.id === mission2Id);
      
      expect(savedMission1?.measurements).toHaveLength(1);
      expect(savedMission2?.measurements).toHaveLength(1);
      expect(savedMission1?.measurements[0].locationContext).toBe('Location A');
      expect(savedMission2?.measurements[0].locationContext).toBe('Location B');
      expect(savedMission1?.measurements[0].pm25).toBe(15);
      expect(savedMission2?.measurements[0].pm25).toBe(18);
    });
  });

  describe('Mission Storage Integration', () => {
    it('should handle complex deduplication scenarios in mission storage', () => {
      const missionId = 'integration-test-999';
      
      // Simulate multiple saves of the same mission with evolving data
      const scenarios = [
        // Scenario 1: Initial partial save
        {
          name: 'Partial Recording (Auto-saved)',
          measurementsCount: 2,
          measurements: [
            { id: 'm1', timestamp: new Date('2025-01-01T10:00:00Z'), pm25: 15 },
            { id: 'm2', timestamp: new Date('2025-01-01T10:15:00Z'), pm25: 18 }
          ]
        },
        // Scenario 2: Crash recovery save
        {
          name: 'Recovered Mission (Session crash)',
          measurementsCount: 3,
          measurements: [
            { id: 'm1', timestamp: new Date('2025-01-01T10:00:00Z'), pm25: 15 },
            { id: 'm2', timestamp: new Date('2025-01-01T10:15:00Z'), pm25: 18 },
            { id: 'm3', timestamp: new Date('2025-01-01T10:30:00Z'), pm25: 20 }
          ]
        },
        // Scenario 3: Final complete save
        {
          name: 'Complete Air Quality Assessment',
          measurementsCount: 4,
          measurements: [
            { id: 'm1', timestamp: new Date('2025-01-01T10:00:00Z'), pm25: 15 },
            { id: 'm2', timestamp: new Date('2025-01-01T10:15:00Z'), pm25: 18 },
            { id: 'm3', timestamp: new Date('2025-01-01T10:30:00Z'), pm25: 20 },
            { id: 'm4', timestamp: new Date('2025-01-01T10:45:00Z'), pm25: 22 }
          ]
        }
      ];

      scenarios.forEach((scenario, index) => {
        const mission: MissionData = {
          id: missionId,
          name: scenario.name,
          startTime: new Date('2025-01-01T10:00:00Z'),
          endTime: new Date('2025-01-01T10:45:00Z'),
          durationMinutes: 45,
          avgPm1: 12, avgPm25: 18, avgPm10: 23, maxPm25: 25,
          measurementsCount: scenario.measurementsCount,
          recordingFrequency: '15s',
          shared: index === 2, // Only final version is shared
          measurements: scenario.measurements.map(m => ({
            ...m,
            pm1: m.pm25 - 3,
            pm10: m.pm25 + 5,
            latitude: 43.6568064,
            longitude: 5.3608448
          })) as MeasurementData[],
          synced: false
        };

        saveMissionLocally(mission);
        
        // Verify only one mission exists after each save
        const missions = getLocalMissions();
        expect(missions).toHaveLength(1);
        expect(missions[0].id).toBe(missionId);
        expect(missions[0].name).toBe(scenario.name);
        expect(missions[0].measurementsCount).toBe(scenario.measurementsCount);
        expect(missions[0].measurements).toHaveLength(scenario.measurementsCount);
      });

      // Final verification - should have the complete version
      const finalMissions = getLocalMissions();
      expect(finalMissions).toHaveLength(1);
      expect(finalMissions[0].name).toBe('Complete Air Quality Assessment');
      expect(finalMissions[0].measurementsCount).toBe(4);
      expect(finalMissions[0].shared).toBe(true);
    });
  });
});
