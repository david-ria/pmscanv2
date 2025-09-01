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
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const fetchOptions = {
      ...options,
      signal: controller.signal
    };
    
    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);
    
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
    // Handle specific error types
    if (fetchError instanceof Error) {
      if (fetchError.name === 'AbortError') {
        return { 
          data: null, 
          error: 'Request timeout - check your connection' 
        };
      }
    }
    
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
 * Retry mechanism for important requests
 */
export async function retryFetch<T = unknown>(
  url: string,
  options?: RequestInit,
  maxRetries = 3,
  delayMs = 1000
): Promise<{ data: T | null; error: string | null }> {
  let lastError = '';
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await offlineSafeFetch<T>(url, options);
    
    if (result.data !== null) {
      return result;
    }
    
    lastError = result.error || 'Unknown error';
    
    // Don't retry on certain error types
    if (lastError.includes('404') || lastError.includes('401') || lastError.includes('403')) {
      break;
    }
    
    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
    }
  }
  
  return { data: null, error: lastError };
}

/**
 * Check network connectivity with a simple ping
 */
export async function checkConnectivity(): Promise<boolean> {
  try {
    const response = await fetch('/health.json', { 
      method: 'HEAD',
      cache: 'no-cache'
    });
    return response.ok;
  } catch {
    return false;
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