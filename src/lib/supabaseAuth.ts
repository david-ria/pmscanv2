// Safe Supabase auth client initialization
import type { AuthError, Session, User } from '@supabase/supabase-js';

let authClient: any = null;
let isInitializing = false;
let initPromise: Promise<any> | null = null;

export const getAuthClient = async () => {
  if (authClient) return authClient;
  
  if (initPromise) return initPromise;
  
  if (isInitializing) {
    // Wait for initialization to complete
    await new Promise(resolve => {
      const checkInit = () => {
        if (authClient || !isInitializing) {
          resolve(authClient);
        } else {
          setTimeout(checkInit, 50);
        }
      };
      checkInit();
    });
    return authClient;
  }
  
  isInitializing = true;
  
  initPromise = new Promise(async (resolve, reject) => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      if (!supabase) {
        throw new Error('Supabase client not available');
      }
      
      authClient = supabase;
      isInitializing = false;
      resolve(supabase);
    } catch (error) {
      isInitializing = false;
      authClient = null;
      reject(error);
    }
  });
  
  return initPromise;
};

export const safeAuthAction = async <T>(
  action: (client: any) => Promise<T>,
  fallback?: T
): Promise<{ data: T | undefined; error: any }> => {
  try {
    const client = await getAuthClient();
    if (!client) {
      return { data: fallback, error: new Error('Auth client not available') };
    }
    
    const result = await action(client);
    return { data: result, error: null };
  } catch (error) {
    console.error('Auth action failed:', error);
    return { data: fallback, error };
  }
};