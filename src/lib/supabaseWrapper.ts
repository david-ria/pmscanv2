/**
 * Lazy Supabase client wrapper
 * Loads Supabase SDK only when actually needed
 */

import { useState, useEffect } from 'react';
import { loadSupabaseClient } from '@/lib/dynamicImports';

// Singleton pattern for lazy-loaded Supabase client
let supabaseClientPromise: Promise<any> | null = null;

/**
 * Get Supabase client with lazy loading
 */
export const getSupabase = async () => {
  if (!supabaseClientPromise) {
    supabaseClientPromise = loadSupabaseClient();
  }
  
  const { supabase } = await supabaseClientPromise;
  return supabase;
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