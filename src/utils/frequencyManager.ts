/**
 * Monotonic frequency management to prevent multiple data points per interval
 * Uses performance.now() for scheduling and timeAuthority.now() for stamping
 */

import { parseFrequencyToMs } from '@/lib/recordingUtils';
import { clock, timeAuthority } from '@/lib/time';

interface TimerState {
  id: number;
  nextMonotonicDeadline: number;
  periodMs: number;
}

const activeRecordingTimers = new Map<string, TimerState>();

/**
 * Creates a frequency-synchronized timer using monotonic scheduling
 */
export function createFrequencySyncedTimer(
  frequency: string,
  callback: () => void,
  id: string = 'default'
): number {
  // Clear any existing timer for this ID
  clearFrequencySyncedTimer(id);
  
  const periodMs = parseFrequencyToMs(frequency);
  const now = clock.now();
  
  // Optional: align to wall clock boundaries for prettier graphs
  const wall = timeAuthority.now();
  const remainder = wall % periodMs;
  const alignDelay = periodMs - remainder;
  let nextMonotonicDeadline = now + alignDelay;
  
  console.log(`⏰ Creating monotonic timer for ${id}: ${periodMs}ms period, first fire in ${alignDelay}ms`);
  
  const timerId = window.setInterval(() => {
    const currentMono = clock.now();
    
    // Check if we've reached the deadline (with small jitter tolerance)
    if (currentMono >= nextMonotonicDeadline - 1) {
      callback();
      // Increment by fixed period to prevent drift
      nextMonotonicDeadline += periodMs;
    }
  }, Math.min(1000, periodMs / 10)); // Check frequently for small periods
  
  activeRecordingTimers.set(id, {
    id: timerId,
    nextMonotonicDeadline,
    periodMs
  });
  
  return timerId;
}

/**
 * Clears a frequency-synced timer
 */
export function clearFrequencySyncedTimer(id: string): void {
  const timerState = activeRecordingTimers.get(id);
  if (timerState) {
    window.clearInterval(timerState.id);
    activeRecordingTimers.delete(id);
    console.log(`⏰ Cleared monotonic timer for ${id}`);
  }
}

/**
 * Clears all active recording timers
 */
export function clearAllFrequencyTimers(): void {
  activeRecordingTimers.forEach((timerState, id) => {
    window.clearInterval(timerState.id);
    console.log(`⏰ Cleared timer ${id}`);
  });
  activeRecordingTimers.clear();
}

/**
 * Check if enough time has passed since last recording using monotonic time
 */
export function shouldRecordAtFrequency(
  lastMonoMs: number | null,
  periodMs: number,
  nowMono: number = clock.now()
): { should: boolean; nowMono: number } {
  if (lastMonoMs == null) {
    return { should: true, nowMono };
  }
  
  const should = (nowMono - lastMonoMs) >= (periodMs - 1); // 1ms jitter tolerance
  return { should, nowMono };
}

/**
 * Legacy wrapper - prefer shouldRecordAtFrequency with explicit periodMs
 */
export function shouldRecordAtFrequencyLegacy(
  lastRecordTime: number,
  frequency: string,
  tolerance: number = 500
): boolean {
  if (lastRecordTime === 0) return true;
  
  const periodMs = parseFrequencyToMs(frequency);
  const { should } = shouldRecordAtFrequency(lastRecordTime, periodMs);
  return should;
}

/**
 * Legacy function name compatibility
 */
export const shouldRecordAtFrequency_old = shouldRecordAtFrequencyLegacy;