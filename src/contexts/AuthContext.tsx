import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { getAuthClient, safeAuthAction } from '@/lib/supabaseAuth';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (
    email: string,
    password: string,
    metadata?: any
  ) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let subscription: any;
    let mounted = true;
    
    const initAuth = async () => {
      try {
        console.log('Starting auth initialization...');
        
        const client = await getAuthClient();
        if (!mounted || !client) {
          console.error('Auth client not available or component unmounted');
          if (mounted) setLoading(false);
          return;
        }
        
        console.log('Auth client ready, setting up listeners...');
        
        // Set up auth state listener
        const {
          data: { subscription: sub },
        } = client.auth.onAuthStateChange((event: string, session: Session | null) => {
          if (!mounted) return;
          console.log('Auth state change:', event, !!session?.user);
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        });
        
        subscription = sub;

        // Check for existing session
        const { data: { session }, error } = await client.auth.getSession();
        if (!mounted) return;
        
        if (error) {
          console.error('Session check error:', error);
        } else {
          console.log('Initial session check:', !!session?.user);
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      } catch (error) {
        console.error('Auth initialization failed:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    return () => {
      mounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await safeAuthAction(
      async (client) => {
        const result = await client.auth.signInWithPassword({ email, password });
        if (result.error) throw result.error;
        return result;
      }
    );
    return { error };
  };

  const signUp = async (email: string, password: string, metadata?: any) => {
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await safeAuthAction(
      async (client) => {
        const result = await client.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: metadata,
          },
        });
        if (result.error) throw result.error;
        return result;
      }
    );
    return { error };
  };

  const signOut = async () => {
    await safeAuthAction(
      async (client) => {
        const result = await client.auth.signOut();
        if (result.error) {
          console.error('Error signing out:', result.error);
        }
        return result;
      }
    );
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await safeAuthAction(
      async (client) => {
        const result = await client.auth.updateUser({
          password: newPassword,
        });
        if (result.error) throw result.error;
        return result;
      }
    );
    return { error };
  };

  const value = {
    user,
    session,
    signIn,
    signUp,
    signOut,
    updatePassword,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
