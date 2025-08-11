/**
 * Frequency parsing & (legacy) wall-clock pacing helpers
 * Prefer monotonic pacing via frequencyManager.shouldRecordAtFrequency
 */

const UNIT_MS: Record<string, number> = {
  ms: 1,
  s: 1000,
  m: 60_000,
};

export const parseFrequencyToMs = (frequency: string): number => {
  const raw = (frequency || '').trim().toLowerCase();

  // Special modes
  if (raw === 'continuous') return 0; // caller interprets 0 as "emit as fast as source"
  if (raw === 'off' || raw === 'disabled' || raw === 'none') return Number.POSITIVE_INFINITY;

  // Accept forms: "500ms", "0.5s", "30s", "2m", " 15  s ", "1.25 m"
  const m = raw.match(/^(\d+(\.\d+)?)\s*(ms|s|m)$/);
  if (!m) {
    // Fallback: pure number means seconds
    const asNum = Number(raw);
    if (!Number.isNaN(asNum) && asNum >= 0) return Math.round(asNum * 1000);
    throw new Error(`Invalid frequency string: "${frequency}"`);
  }
  const value = Number(m[1]);
  const unit = m[3] as keyof typeof UNIT_MS;
  const ms = value * UNIT_MS[unit];

  // Clamp to sane minimum to avoid zero/negative or ultra-tight loops
  return Math.max(1, Math.round(ms));
};

/**
 * LEGACY wall-clock check. Prefer shouldRecordAtFrequency (monotonic).
 */
export const shouldRecordData = (
  lastRecordedTime: number | Date | null,
  frequencyMs: number
): boolean => {
  if (!lastRecordedTime) return true;
  const lastTime = typeof lastRecordedTime === 'number' ? lastRecordedTime : lastRecordedTime.getTime();
  const currentTime = Date.now(); // ⚠️ wall clock — keep only for legacy paths
  return currentTime - lastTime >= frequencyMs;
};
