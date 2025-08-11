/**
 * Centralized debug logger with throttling to prevent log spam
 */

interface LogEntry {
  lastLogged: number;
  count: number;
}

const logThrottleMap = new Map<string, LogEntry>();
const DEFAULT_THROTTLE_MS = 2000; // 2 seconds between same log messages

/**
 * Throttled logger that prevents spam of identical messages
 */
export function throttledLog(key: string, message: string, data?: any, throttleMs = DEFAULT_THROTTLE_MS): void {
  const now = Date.now();
  const entry = logThrottleMap.get(key);
  
  if (!entry || (now - entry.lastLogged) > throttleMs) {
    // Log the message
    if (data !== undefined) {
      console.log(message, data);
    } else {
      console.log(message);
    }
    
    // If we had buffered logs, show count
    if (entry && entry.count > 1) {
      console.log(`↳ (${entry.count - 1} similar messages throttled)`);
    }
    
    logThrottleMap.set(key, { lastLogged: now, count: 1 });
  } else {
    // Just increment count
    entry.count++;
  }
}

/**
 * Force log without throttling (for important messages)
 */
export function forceLog(message: string, data?: any): void {
  if (data !== undefined) {
    console.log(message, data);
  } else {
    console.log(message);
  }
}

/**
 * Clear throttle cache
 */
export function clearLogThrottle(): void {
  logThrottleMap.clear();
}

/**
 * Debug logger specifically for data processing
 */
export function logDataProcessing(component: string, dataLength: number, latestValue?: number, throttle = true): void {
  const message = `📊 ${component}: Processing ${dataLength} data points${latestValue !== undefined ? `, latest value: ${latestValue}` : ''}`;
  
  if (throttle) {
    throttledLog(`${component}-processing`, message);
  } else {
    forceLog(message);
  }
}

/**
 * Debug logger for polling updates
 */
export function logPollingUpdate(component: string, count: number, latestValue?: number): void {
  throttledLog(
    `${component}-polling`, 
    `📊 ${component}: got ${count} points${latestValue !== undefined ? `, latest: ${latestValue}` : ''}`
  );
}