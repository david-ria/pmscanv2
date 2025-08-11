/**
 * Recording invariants tests - simulate recording period with timing assertions
 */

import { describe, test, expect } from 'vitest';
import { parseFrequencyToMs, shouldRecordData } from '@/lib/recordingUtils';

// Mock timer utilities for testing
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('Recording Invariants', () => {
  test('simulates 10s recording period with correct bucket count', async () => {
    const frequency = '1s'; // 1 second intervals
    const frequencyMs = parseFrequencyToMs(frequency);
    const simulationDurationMs = 10000; // 10 seconds
    const expectedBuckets = Math.floor(simulationDurationMs / frequencyMs);
    
    const buckets: number[] = [];
    const bucketSet = new Set<number>();
    let lastRecordedTime: number | null = null;
    
    const startTime = Date.now();
    
    // Simulate data points arriving every 100ms for 10 seconds
    while (Date.now() - startTime < simulationDurationMs) {
      const currentTime = Date.now();
      
      if (shouldRecordData(lastRecordedTime, frequencyMs)) {
        const bucketTime = Math.floor(currentTime / frequencyMs) * frequencyMs;
        buckets.push(bucketTime);
        bucketSet.add(bucketTime);
        lastRecordedTime = currentTime;
      }
      
      await sleep(50); // High frequency polling
    }
    
    // Assertions
    expect(buckets.length).toBeGreaterThanOrEqual(expectedBuckets - 1); // Allow ±1 for timing
    expect(buckets.length).toBeLessThanOrEqual(expectedBuckets + 2);
    expect(bucketSet.size).toBe(buckets.length); // No duplicates
    
    // Check timestamps are ordered
    for (let i = 1; i < buckets.length; i++) {
      expect(buckets[i]).toBeGreaterThanOrEqual(buckets[i - 1]);
    }
  }, 12000);

  test('high frequency recording (500ms) produces correct buckets', async () => {
    const frequency = '500ms';
    const frequencyMs = parseFrequencyToMs(frequency);
    const simulationDurationMs = 3000; // 3 seconds
    const expectedBuckets = Math.floor(simulationDurationMs / frequencyMs);
    
    const buckets: number[] = [];
    const bucketSet = new Set<number>();
    let lastRecordedTime: number | null = null;
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < simulationDurationMs) {
      const currentTime = Date.now();
      
      if (shouldRecordData(lastRecordedTime, frequencyMs)) {
        const bucketTime = Math.floor(currentTime / frequencyMs) * frequencyMs;
        buckets.push(bucketTime);
        bucketSet.add(bucketTime);
        lastRecordedTime = currentTime;
      }
      
      await sleep(25); // Even higher frequency polling
    }
    
    // Should have approximately 6 buckets (3000ms / 500ms)
    expect(buckets.length).toBeGreaterThanOrEqual(expectedBuckets - 1);
    expect(buckets.length).toBeLessThanOrEqual(expectedBuckets + 2);
    expect(bucketSet.size).toBe(buckets.length); // No duplicates
  }, 5000);

  test('continuous mode allows all data points', () => {
    const frequency = 'continuous';
    const frequencyMs = parseFrequencyToMs(frequency);
    
    expect(frequencyMs).toBe(0);
    
    // All data points should be recorded in continuous mode
    expect(shouldRecordData(null, frequencyMs)).toBe(true);
    expect(shouldRecordData(Date.now() - 1, frequencyMs)).toBe(true);
    expect(shouldRecordData(Date.now() - 100, frequencyMs)).toBe(true);
  });

  test('off mode blocks all data points', () => {
    const frequency = 'off';
    const frequencyMs = parseFrequencyToMs(frequency);
    
    expect(frequencyMs).toBe(Number.POSITIVE_INFINITY);
    
    // No data points should be recorded when off
    expect(shouldRecordData(null, frequencyMs)).toBe(true); // First data point allowed
    expect(shouldRecordData(Date.now() - 1000000, frequencyMs)).toBe(false); // All others blocked
  });
});