import { describe, it, expect } from 'vitest';
import { calculateCookingFeatures, enhanceCookingEventWithFeatures } from '../cookingFeatures';
import { PMScanData } from '@/lib/pmscan/types';
import { CookingEvent } from '@/utils/eventUtils';

// Mock cooking episode data
function createMockCookingEpisode(): PMScanData[] {
  const baseTime = new Date('2024-01-15T18:30:00Z'); // Dinner time
  const measurements: PMScanData[] = [];
  
  // 20-minute cooking episode with realistic PM patterns
  for (let i = 0; i < 40; i++) { // 2 measurements per minute
    const timestamp = new Date(baseTime.getTime() + i * 30 * 1000); // 30s intervals
    
    // Simulate cooking pattern: baseline → rise → peak → decay
    let pm25: number;
    let pm1: number;
    let pm10: number;
    
    if (i < 8) {
      // Baseline period (first 4 minutes)
      pm25 = 8 + Math.random() * 2;
      pm1 = pm25 * 0.7;
      pm10 = pm25 * 1.3;
    } else if (i < 20) {
      // Rising phase (minutes 4-10)
      const riseProgress = (i - 8) / 12;
      pm25 = 8 + riseProgress * 35 + Math.random() * 3; // Rise to ~40 µg/m³
      pm1 = pm25 * (0.7 + riseProgress * 0.2); // Cooking signature
      pm10 = pm25 * 1.3;
    } else if (i < 28) {
      // Peak plateau (minutes 10-14)
      pm25 = 40 + Math.random() * 8; // Peak around 40-48 µg/m³
      pm1 = pm25 * 0.8; // High PM1/PM2.5 ratio during cooking
      pm10 = pm25 * 1.2;
    } else {
      // Decay phase (minutes 14-20)
      const decayProgress = (i - 28) / 12;
      pm25 = 40 - decayProgress * 25 + Math.random() * 3; // Decay back towards baseline
      pm1 = pm25 * (0.8 - decayProgress * 0.2);
      pm10 = pm25 * 1.25;
    }
    
    measurements.push({
      pm1,
      pm25,
      pm10,
      temp: 22.5 + (i / 40) * 3 + Math.random() * 0.5, // Temperature rises slightly
      humidity: 45 + (i / 40) * 8 + Math.random() * 2,  // Humidity increases during cooking
      battery: 85,
      charging: false,
      timestamp
    });
  }
  
  return measurements;
}

describe('Cooking Features Calculation', () => {
  it('should calculate all features correctly for a typical cooking episode', () => {
    const measurements = createMockCookingEpisode();
    const episodeStart = measurements[8].timestamp; // Start of cooking activity
    const episodeEnd = measurements[measurements.length - 1].timestamp;
    
    const features = calculateCookingFeatures(
      measurements,
      episodeStart,
      episodeEnd,
      'Home Kitchen',
      'Indoor still'
    );
    
    console.log('Test cooking features:', features);
    
    // Verify basic structure
    expect(features).toBeDefined();
    expect(typeof features.R1).toBe('number');
    expect(typeof features.R10).toBe('number');
    expect(typeof features.riseRate).toBe('number');
    
    // Verify reasonable ranges
    expect(features.R1).toBeGreaterThan(0.5);
    expect(features.R1).toBeLessThan(1.5);
    expect(features.R10).toBeGreaterThan(1.0);
    expect(features.R10).toBeLessThan(2.0);
    
    // Verify temporal features
    expect(features.duration).toBeGreaterThan(10); // Should be ~16 minutes
    expect(features.riseRate).toBeGreaterThan(0); // Should show rising PM2.5
    expect(features.peakHeight).toBeGreaterThan(20); // Should show significant elevation
    
    // Verify context detection
    expect(features.mealTime).toBe(true); // 18:30 is dinner time
    expect(features.atHome).toBe(true); // Location context contains 'Home'
    expect(features.kitchenBeacon).toBe(true); // Location contains 'Kitchen'
    expect(features.still).toBe(true); // Automatic context indicates still
    
    // Verify environmental changes
    expect(features.deltaT).toBeGreaterThan(0); // Temperature should increase
    expect(features.deltaRH).toBeGreaterThan(0); // Humidity should increase
    
    // Verify data quality assessment
    expect(features.dataQuality).toBe('good');
    expect(features.measurementCount).toBeGreaterThan(20);
  });

  it('should handle insufficient data gracefully', () => {
    const measurements: PMScanData[] = [
      {
        pm1: 5, pm25: 8, pm10: 12, temp: 22, humidity: 45,
        battery: 85, charging: false, timestamp: new Date()
      }
    ];
    
    const features = calculateCookingFeatures(
      measurements,
      new Date(),
      new Date(Date.now() + 10 * 60 * 1000),
      'Unknown',
      'Unknown'
    );
    
    expect(features.dataQuality).toBe('poor');
    expect(features.measurementCount).toBe(0); // Insufficient data
  });

  it('should enhance cooking events with features', () => {
    const measurements = createMockCookingEpisode();
    const cookingEvent: CookingEvent = {
      id: 'test-cooking-1',
      missionId: 'mission-1',
      eventType: 'cooking',
      start: measurements[8].timestamp.getTime(),
      end: measurements[measurements.length - 1].timestamp.getTime(),
      scoreMax: 45,
      createdBy: 'test-user',
      timestamp: measurements[8].timestamp
    };
    
    const enhanced = enhanceCookingEventWithFeatures(
      cookingEvent,
      measurements,
      'Home Kitchen',
      'Indoor still'
    );
    
    expect(enhanced.features).toBeDefined();
    expect(enhanced.features!.R1).toBeGreaterThan(0);
    expect(enhanced.features!.peak25).toBeGreaterThan(enhanced.features!.baseline25);
    expect(enhanced.eventType).toBe('cooking');
  });

  it('should detect meal time context correctly', () => {
    const breakfastTime = new Date('2024-01-15T07:30:00Z');
    const lunchTime = new Date('2024-01-15T12:45:00Z');
    const dinnerTime = new Date('2024-01-15T19:15:00Z');
    const offTime = new Date('2024-01-15T15:30:00Z');
    
    const measurements = createMockCookingEpisode();
    
    // Test breakfast
    const breakfastFeatures = calculateCookingFeatures(
      measurements.map(m => ({ ...m, timestamp: new Date(breakfastTime.getTime() + Math.random() * 1000) })),
      breakfastTime,
      new Date(breakfastTime.getTime() + 20 * 60 * 1000)
    );
    expect(breakfastFeatures.mealTime).toBe(true);
    
    // Test lunch  
    const lunchFeatures = calculateCookingFeatures(
      measurements.map(m => ({ ...m, timestamp: new Date(lunchTime.getTime() + Math.random() * 1000) })),
      lunchTime,
      new Date(lunchTime.getTime() + 20 * 60 * 1000)
    );
    expect(lunchFeatures.mealTime).toBe(true);
    
    // Test dinner
    const dinnerFeatures = calculateCookingFeatures(
      measurements.map(m => ({ ...m, timestamp: new Date(dinnerTime.getTime() + Math.random() * 1000) })),
      dinnerTime,
      new Date(dinnerTime.getTime() + 20 * 60 * 1000)
    );
    expect(dinnerFeatures.mealTime).toBe(true);
    
    // Test off-time
    const offFeatures = calculateCookingFeatures(
      measurements.map(m => ({ ...m, timestamp: new Date(offTime.getTime() + Math.random() * 1000) })),
      offTime,
      new Date(offTime.getTime() + 20 * 60 * 1000)
    );
    expect(offFeatures.mealTime).toBe(false);
  });
});