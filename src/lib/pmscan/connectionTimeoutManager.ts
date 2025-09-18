import { safeBleDebugger } from '@/lib/bleSafeWrapper';

/**
 * Manages connection timeouts and fallback to picker
 */
export class ConnectionTimeoutManager {
  private static timeoutId: NodeJS.Timeout | null = null;
  private static onTimeoutCallback: (() => void) | null = null;

  /**
   * Start a timeout to show picker if connection doesn't start
   */
  public static startConnectionTimeout(onTimeout: () => void, timeoutMs: number = 3000): void {
    this.clearTimeout();
    
    this.onTimeoutCallback = onTimeout;
    this.timeoutId = setTimeout(() => {
      if (this.onTimeoutCallback) {
        safeBleDebugger.info('PICKER', '[BLE:PICKER] fallback-open (connect not started)', undefined, { 
          timeoutMs 
        });
        this.onTimeoutCallback();
        this.clearTimeout();
      }
    }, timeoutMs);
  }

  /**
   * Clear the timeout (connection started successfully)
   */
  public static clearTimeout(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
      this.onTimeoutCallback = null;
    }
  }

  /**
   * Check if timeout is active
   */
  public static isActive(): boolean {
    return this.timeoutId !== null;
  }
}