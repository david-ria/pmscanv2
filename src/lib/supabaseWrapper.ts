/**
 * Supabase client wrapper that lazy loads the client only when needed
 */

let supabaseClient: any = null;

export const getSupabaseClient = async () => {
  if (!supabaseClient) {
    const { loadSupabaseClient } = await import('@/lib/dynamicImports');
    const { supabase } = await loadSupabaseClient();
    supabaseClient = supabase;
  }
  return supabaseClient;
};

// Export commonly used functions that will be dynamically loaded
export const useSupabaseAuth = async () => {
  const supabase = await getSupabaseClient();
  return {
    signIn: supabase.auth.signInWithPassword,
    signUp: supabase.auth.signUp,
    signOut: supabase.auth.signOut,
    getUser: () => supabase.auth.getUser(),
    onAuthStateChange: supabase.auth.onAuthStateChange
  };
};

export const useSupabaseQuery = async () => {
  const supabase = await getSupabaseClient();
  return {
    from: supabase.from,
    functions: supabase.functions,
    storage: supabase.storage
  };
};