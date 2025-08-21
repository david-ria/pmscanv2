/**
 * Test mode utilities for disabling risky subsystems during E2E testing
 */

/**
 * Checks if the app is running in test mode
 * Test mode is enabled when:
 * - VITE_E2E environment variable is set to '1'
 * - URL contains ?e2e=1 parameter
 */
export function isTestMode(): boolean {
  // Check environment variable first
  if (import.meta.env.VITE_E2E === '1') {
    return true;
  }
  
  // Check URL parameter if we're in a browser environment
  if (typeof window !== 'undefined' && window.location) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('e2e') === '1';
  }
  
  return false;
}

/**
 * Logs when test mode disables a subsystem
 */
export function logTestModeDisabled(subsystem: string): void {
  if (isTestMode()) {
    console.log(`🧪 [TEST MODE] Disabled: ${subsystem}`);
  }
}

/**
 * Safe wrapper for operations that should be disabled in test mode
 */
export function runIfNotTestMode(operation: () => void, subsystemName: string): void {
  if (isTestMode()) {
    logTestModeDisabled(subsystemName);
    return;
  }
  
  operation();
}

/**
 * Safe wrapper for async operations that should be disabled in test mode
 */
export async function runAsyncIfNotTestMode<T>(
  operation: () => Promise<T>, 
  subsystemName: string,
  fallbackValue?: T
): Promise<T | undefined> {
  if (isTestMode()) {
    logTestModeDisabled(subsystemName);
    return fallbackValue;
  }
  
  return operation();
}

/**
 * Mock function for disabled operations in test mode
 */
export function createTestModeMock<T extends (...args: any[]) => any>(
  originalFunction: T,
  subsystemName: string,
  mockReturnValue?: ReturnType<T>
): T {
  return ((...args: Parameters<T>): ReturnType<T> => {
    if (isTestMode()) {
      logTestModeDisabled(subsystemName);
      return mockReturnValue as ReturnType<T>;
    }
    
    return originalFunction(...args);
  }) as T;
}