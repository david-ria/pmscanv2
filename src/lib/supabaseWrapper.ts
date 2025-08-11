/**
 * Lazy Supabase client wrapper
 * Loads Supabase SDK only when actually needed
 */

import { useState, useEffect } from 'react';
import { loadSupabaseClient } from '@/lib/dynamicImports';

// Singleton pattern for lazy-loaded Supabase client
let supabaseClientPromise: Promise<any> | null = null;

/**
 * Get Supabase client with lazy loading and error recovery
 */
export const getSupabase = async () => {
  if (!supabaseClientPromise) {
    supabaseClientPromise = loadSupabaseClient().catch((error) => {
      console.error('Failed to load Supabase client:', error);
      // Reset promise to allow retry
      supabaseClientPromise = null;
      throw error;
    });
  }
  
  try {
    const { supabase } = await supabaseClientPromise;
    return supabase;
  } catch (error) {
    console.error('Supabase client error, attempting fallback:', error);
    // Clear failed promise and try direct import as fallback
    supabaseClientPromise = null;
    const { supabase } = await import('@/integrations/supabase/client');
    return supabase;
  }
};

/**
 * Hook for lazy Supabase loading
 */
export const useSupabaseLazy = () => {
  const [supabase, setSupabase] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadClient = async () => {
      try {
        const client = await getSupabase();
        if (mounted) {
          setSupabase(client);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error);
          setLoading(false);
        }
      }
    };

    loadClient();

    return () => {
      mounted = false;
    };
  }, []);

  return { supabase, loading, error };
};