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
  anchorWallEpochMs: number; // wall time (UTC) aligned to the very first deadline
  emitted: number;           // number of callbacks emitted since start (for diagnostics/catch-up math)
  checkEveryMs: number;      // current polling cadence
  visibilityListener?: () => void; // store reference for proper cleanup
}

const activeRecordingTimers = new Map<string, TimerState>();

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Creates a frequency-synchronized timer using monotonic scheduling
 * - Aligns first fire to the next wall-clock boundary (0..period)
 * - Paces on performance.now(), independent of system clock jumps
 * - Catches up (bounded) if the page was throttled/asleep
 */
export function createFrequencySyncedTimer(
  frequency: string,
  callback: () => void,
  id: string = 'default'
): number {
  clearFrequencySyncedTimer(id);

  const periodMs = parseFrequencyToMs(frequency);
  const nowMono = clock.now();

  // Optional: align to wall clock boundaries for prettier graphs
  const wall = timeAuthority.now();
  const remainder = wall % periodMs;

  // ✅ if already aligned, don't wait a full period
  const alignDelay = remainder === 0 ? 0 : (periodMs - remainder);

  const anchorWallEpochMs = wall + alignDelay;
  let nextMonotonicDeadline = nowMono + alignDelay;

  const baseCheckEvery = clamp(periodMs / 10, 16, 1000);
  let checkEveryMs = document?.hidden ? 1000 : baseCheckEvery;

  // Visibility-aware polling: relax when hidden to save battery, we'll catch up on resume.
  const onVisibility = () => {
    checkEveryMs = document.hidden ? 1000 : baseCheckEvery;
    // Nothing else to do; catch-up happens in the interval loop.
  };
  document.addEventListener?.('visibilitychange', onVisibility);

  // Bounded catch-up to avoid event storms after long sleeps
  const MAX_CATCHUP_BATCH = 5;   // emit at most 5 missed periods per tick
  const JITTER_TOL_MS = 1;       // small tolerance for comparisons

  const timerId = window.setInterval(() => {
    const currentMono = clock.now();

    // Emit once per period that we passed (bounded)
    let emittedThisTick = 0;
    while (currentMono >= nextMonotonicDeadline - JITTER_TOL_MS) {
      callback();

      // Advance schedule
      nextMonotonicDeadline += periodMs;
      emittedThisTick++;
      const state = activeRecordingTimers.get(id);
      if (state) state.emitted += 1;

      // Avoid storms
      if (emittedThisTick >= MAX_CATCHUP_BATCH) break;
    }

    // If the page visibility changed, adjust interval cadence (recreate interval to apply)
    const state = activeRecordingTimers.get(id);
    if (state && state.checkEveryMs !== checkEveryMs) {
      // Recreate interval with new cadence
      window.clearInterval(state.id);
      const newTimerId = window.setInterval(arguments.callee as TimerHandler, checkEveryMs);
      activeRecordingTimers.set(id, {
        ...state,
        id: newTimerId,
        checkEveryMs,
      });
    }
  }, checkEveryMs);

  const timerState: TimerState = {
    id: timerId,
    nextMonotonicDeadline,
    periodMs,
    anchorWallEpochMs,
    emitted: 0,
    checkEveryMs,
    visibilityListener: onVisibility,
  };

  activeRecordingTimers.set(id, timerState);

  console.log(
    `⏰ Creating monotonic timer for ${id}: ${periodMs}ms period, first fire in ${alignDelay}ms (check=${checkEveryMs}ms)`
  );

  return timerId;
}

/**
 * Clears a frequency-synced timer
 */
export function clearFrequencySyncedTimer(id: string): void {
  const timerState = activeRecordingTimers.get(id);
  if (timerState) {
    window.clearInterval(timerState.id);
    if (timerState.visibilityListener) {
      document.removeEventListener?.('visibilitychange', timerState.visibilityListener);
    }
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
    if (timerState.visibilityListener) {
      document.removeEventListener?.('visibilitychange', timerState.visibilityListener);
    }
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
 * NOTE: The tolerance param was unused; removed to avoid confusion.
 */
export function shouldRecordAtFrequencyLegacy(
  lastRecordTime: number,
  frequency: string
): boolean {
  if (lastRecordTime === 0) return true;

  const periodMs = parseFrequencyToMs(frequency);
  const { should } = shouldRecordAtFrequency(lastRecordTime, periodMs);
  return should;
}

/**
 * Optional: update an existing timer's frequency without tearing down the caller's logic
 */
export function updateFrequencySyncedTimer(id: string, newFrequency: string) {
  const existing = activeRecordingTimers.get(id);
  if (!existing) return createFrequencySyncedTimer(newFrequency, () => {}, id);

  clearFrequencySyncedTimer(id);
  return createFrequencySyncedTimer(newFrequency, () => {}, id);
}

/**
 * Optional: read-only snapshot for diagnostics (e.g., timestampDebug)
 */
export function getTimerState(id: string): Readonly<TimerState> | undefined {
  const st = activeRecordingTimers.get(id);
  return st ? { ...st } : undefined;
}

// Legacy alias for compatibility
export const shouldRecordAtFrequency_old = shouldRecordAtFrequencyLegacy;