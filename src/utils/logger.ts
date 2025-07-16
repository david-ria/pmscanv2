const logLevel = import.meta.env.VITE_LOG_LEVEL;
const DEBUG_ENABLED =
  logLevel ? logLevel === 'debug' : import.meta.env.DEV;

export function debug(...args: unknown[]) {
  if (DEBUG_ENABLED) {
    console.debug(...args);
  }
}

const lastLogTimes: Record<string, number> = {};

/**
 * Logs a debug message at most once per interval for a given key.
 *
 * @param key Unique identifier for the log call
 * @param intervalMs Minimum interval between log calls
 * @param args Arguments to log
 */
export function rateLimitedDebug(
  key: string,
  intervalMs: number,
  ...args: unknown[]
) {
  if (!DEBUG_ENABLED) return;
  const now = Date.now();
  const last = lastLogTimes[key] ?? 0;
  if (now - last >= intervalMs) {
    lastLogTimes[key] = now;
    console.debug(...args);
  }
}

export function info(...args: unknown[]) {
  console.info(...args);
}

export function error(...args: unknown[]) {
  console.error(...args);
}

export default { debug, info, error, rateLimitedDebug };
