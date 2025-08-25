import { supabase } from '@/integrations/supabase/client';
import { safeJson } from '@/utils/safeJson';
import { isOfflineError, getOfflineMessage } from '@/lib/offlineUtils';

/**
 * Enhanced Supabase wrapper that gracefully handles offline scenarios
 * and prevents JSON parsing errors from HTML error pages
 */

export interface SafeSupabaseResult<T> {
  data: T | null;
  error: string | null;
  isOffline: boolean;
}

/**
 * Safe wrapper for Supabase RPC calls
 */
export async function safeSupabaseRpc<T = any>(
  functionName: string,
  params?: Record<string, any>
): Promise<SafeSupabaseResult<T>> {
  try {
    const { data, error } = await (supabase as any).rpc(functionName, params);
    
    if (error) {
      const errorMessage = error.message || 'Database operation failed';
      return {
        data: null,
        error: errorMessage,
        isOffline: isOfflineError(errorMessage)
      };
    }
    
    return {
      data: data as T,
      error: null,
      isOffline: false
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    return {
      data: null,
      error: getOfflineMessage(errorMessage),
      isOffline: isOfflineError(errorMessage)
    };
  }
}

/**
 * Safe wrapper for Supabase table operations
 */
export async function safeSupabaseQuery<T = any>(
  queryBuilder: any
): Promise<SafeSupabaseResult<T>> {
  try {
    const { data, error } = await queryBuilder;
    
    if (error) {
      const errorMessage = error.message || 'Database query failed';
      return {
        data: null,
        error: errorMessage,
        isOffline: isOfflineError(errorMessage)
      };
    }
    
    return {
      data,
      error: null,
      isOffline: false
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    return {
      data: null,
      error: getOfflineMessage(errorMessage),
      isOffline: isOfflineError(errorMessage)
    };
  }
}

/**
 * Safe wrapper for Supabase Edge Functions
 */
export async function safeSupabaseFunction<T = any>(
  functionName: string,
  options?: { body?: any; headers?: Record<string, string> }
): Promise<SafeSupabaseResult<T>> {
  try {
    const { data, error } = await supabase.functions.invoke(functionName, options);
    
    if (error) {
      const errorMessage = error.message || 'Edge function call failed';
      return {
        data: null,
        error: errorMessage,
        isOffline: isOfflineError(errorMessage)
      };
    }
    
    return {
      data,
      error: null,
      isOffline: false
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    return {
      data: null,
      error: getOfflineMessage(errorMessage),
      isOffline: isOfflineError(errorMessage)
    };
  }
}

/**
 * Check if we're currently offline
 */
export function isCurrentlyOffline(): boolean {
  return !navigator.onLine;
}

/**
 * Enhanced offline-aware Supabase client with automatic fallback
 */
export const offlineAwareSupabase = {
  rpc: safeSupabaseRpc,
  query: safeSupabaseQuery,
  functions: safeSupabaseFunction,
  isOffline: isCurrentlyOffline
};