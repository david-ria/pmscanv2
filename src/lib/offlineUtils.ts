import { safeJson } from '@/utils/safeJson';

/**
 * Enhanced fetch wrapper that gracefully handles offline scenarios
 * and prevents "Unexpected token '<'" JSON parsing errors
 */
export async function offlineSafeFetch<T = unknown>(
  url: string, 
  options?: RequestInit
): Promise<{ data: T | null; error: string | null }> {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      return { 
        data: null, 
        error: `HTTP ${response.status}: ${response.statusText}` 
      };
    }

    const data = await safeJson<T>(response);
    
    if (data === null) {
      return { 
        data: null, 
        error: 'Invalid or non-JSON response received' 
      };
    }

    return { data, error: null };
    
  } catch (fetchError) {
    // Network errors, including offline scenarios
    const errorMessage = fetchError instanceof Error 
      ? fetchError.message 
      : 'Network request failed';
      
    return { 
      data: null, 
      error: `Network error: ${errorMessage}` 
    };
  }
}

/**
 * Check if the current error indicates we're offline
 */
export function isOfflineError(error: string): boolean {
  const offlineIndicators = [
    'network request failed',
    'fetch failed',
    'network error',
    'connection failed',
    'net::err_network_changed',
    'net::err_internet_disconnected'
  ];
  
  const errorLower = error.toLowerCase();
  return offlineIndicators.some(indicator => errorLower.includes(indicator));
}

/**
 * Show user-friendly offline message
 */
export function getOfflineMessage(error: string): string {
  if (isOfflineError(error)) {
    return 'You appear to be offline. Some features may not be available until your connection is restored.';
  }
  
  return 'There was a problem connecting to our servers. Please try again later.';
}