/**
 * Centralized frequency management to prevent multiple data points per interval
 */

import { parseFrequencyToMs } from '@/lib/recordingUtils';

const activeRecordingTimers = new Map<string, number>();

/**
 * Creates a frequency-synchronized timer that prevents multiple recordings in the same interval
 */
export function createFrequencySyncedTimer(
  frequency: string,
  callback: () => void,
  id: string = 'default'
): number {
  // Clear any existing timer for this ID
  clearFrequencySyncedTimer(id);
  
  const intervalMs = parseFrequencyToMs(frequency);
  
  // Round to the nearest second to align with frequency
  const alignedInterval = Math.round(intervalMs / 1000) * 1000;
  
  console.log(`⏰ Creating synced timer for ${id}: ${alignedInterval}ms (${frequency})`);
  
  const timerId = window.setInterval(() => {
    const now = Date.now();
    // Only execute if we're aligned with the frequency boundary
    const secondsSinceEpoch = Math.floor(now / 1000);
    const frequencyInSeconds = Math.round(alignedInterval / 1000);
    
    if (secondsSinceEpoch % frequencyInSeconds === 0) {
      callback();
    }
  }, 1000); // Check every second for alignment
  
  activeRecordingTimers.set(id, timerId);
  return timerId;
}

/**
 * Clears a frequency-synced timer
 */
export function clearFrequencySyncedTimer(id: string): void {
  const timerId = activeRecordingTimers.get(id);
  if (timerId) {
    window.clearInterval(timerId);
    activeRecordingTimers.delete(id);
    console.log(`⏰ Cleared synced timer for ${id}`);
  }
}

/**
 * Clears all active recording timers
 */
export function clearAllFrequencyTimers(): void {
  activeRecordingTimers.forEach((timerId, id) => {
    window.clearInterval(timerId);
    console.log(`⏰ Cleared timer ${id}`);
  });
  activeRecordingTimers.clear();
}

/**
 * Check if enough time has passed since last recording for this frequency
 */
export function shouldRecordAtFrequency(
  lastRecordTime: number,
  frequency: string,
  tolerance: number = 500
): boolean {
  if (lastRecordTime === 0) return true;
  
  const now = Date.now();
  const intervalMs = parseFrequencyToMs(frequency);
  const timeSinceLastRecord = now - lastRecordTime;
  
  return timeSinceLastRecord >= (intervalMs - tolerance);
}