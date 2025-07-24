import { supabase } from '@/integrations/supabase/client';

let isAuthReady = false;
let authReadyPromise: Promise<void> | null = null;

// Initialize auth readiness check
const initializeAuthReadiness = async () => {
  try {
    // Wait for supabase client to be fully initialized
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Test if auth is accessible
    await supabase.auth.getSession();
    isAuthReady = true;
  } catch (error) {
    console.error('Auth initialization error:', error);
    // Retry after delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return initializeAuthReadiness();
  }
};

// Start initialization immediately
authReadyPromise = initializeAuthReadiness();

/**
 * Safe wrapper for supabase.auth.getUser() that waits for auth to be ready
 */
export const getSafeUser = async () => {
  if (!isAuthReady && authReadyPromise) {
    await authReadyPromise;
  }
  
  try {
    return await supabase.auth.getUser();
  } catch (error) {
    console.error('Error getting user:', error);
    return { data: { user: null }, error };
  }
};

/**
 * Safe wrapper for supabase.auth.getSession() that waits for auth to be ready
 */
export const getSafeSession = async () => {
  if (!isAuthReady && authReadyPromise) {
    await authReadyPromise;
  }
  
  try {
    return await supabase.auth.getSession();
  } catch (error) {
    console.error('Error getting session:', error);
    return { data: { session: null }, error };
  }
};

/**
 * Check if auth is ready without throwing errors
 */
export const isAuthInitialized = () => isAuthReady;