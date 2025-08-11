/**
 * Tests for parseFrequencyToMs function
 */

import { describe, test, expect } from 'vitest';
import { parseFrequencyToMs } from '../recordingUtils';

describe('parseFrequencyToMs', () => {
  test('handles millisecond values', () => {
    expect(parseFrequencyToMs('500ms')).toBe(500);
    expect(parseFrequencyToMs('100ms')).toBe(100);
  });

  test('handles second values', () => {
    expect(parseFrequencyToMs('0.5s')).toBe(500);
    expect(parseFrequencyToMs('30s')).toBe(30000);
    expect(parseFrequencyToMs('1s')).toBe(1000);
  });

  test('handles minute values', () => {
    expect(parseFrequencyToMs('2m')).toBe(120000);
    expect(parseFrequencyToMs('1.5m')).toBe(90000);
  });

  test('handles special modes', () => {
    expect(parseFrequencyToMs('continuous')).toBe(0);
    expect(parseFrequencyToMs('off')).toBe(Number.POSITIVE_INFINITY);
    expect(parseFrequencyToMs('disabled')).toBe(Number.POSITIVE_INFINITY);
    expect(parseFrequencyToMs('none')).toBe(Number.POSITIVE_INFINITY);
  });

  test('handles whitespace and case insensitive', () => {
    expect(parseFrequencyToMs(' 30S ')).toBe(30000);
    expect(parseFrequencyToMs('CONTINUOUS')).toBe(0);
    expect(parseFrequencyToMs(' 2.5 m ')).toBe(150000);
  });

  test('handles fallback number parsing (seconds)', () => {
    expect(parseFrequencyToMs('5')).toBe(5000);
    expect(parseFrequencyToMs('0.5')).toBe(500);
  });

  test('throws for invalid input', () => {
    expect(() => parseFrequencyToMs('invalid')).toThrow('Invalid frequency string: "invalid"');
    expect(() => parseFrequencyToMs('abc123')).toThrow();
    expect(() => parseFrequencyToMs('')).toThrow();
    expect(() => parseFrequencyToMs('-5s')).toThrow();
  });

  test('clamps to minimum 1ms', () => {
    expect(parseFrequencyToMs('0.0001ms')).toBe(1);
    expect(parseFrequencyToMs('0s')).toBe(1);
  });
});