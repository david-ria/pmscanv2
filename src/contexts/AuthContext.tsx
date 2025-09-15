import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabaseWrapper';
import { attachAuthRefreshGuard } from '@/utils/authRefreshGuard';

interface AuthError {
  message: string;
  [key: string]: unknown;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (
    email: string,
    password: string,
    metadata?: Record<string, unknown>
  ) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
  resendConfirmationEmail: (email: string) => Promise<{ error: AuthError | null }>;
  signInWithMagicLink: (email: string) => Promise<{ error: AuthError | null }>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [supabaseClient, setSupabaseClient] = useState<Awaited<ReturnType<typeof getSupabase>> | null>(null);

  useEffect(() => {
    let subscription: ReturnType<Awaited<ReturnType<typeof getSupabase>>['auth']['onAuthStateChange']> | null = null;

    const initializeAuth = async () => {
      try {
        const supabase = await getSupabase();
        attachAuthRefreshGuard(supabase);
        setSupabaseClient(supabase);

        // Set up auth state listener
        const {
          data: { subscription: authSubscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        });

        subscription = authSubscription;

        // Check for existing session
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      } catch (error) {
        console.error('Failed to initialize Supabase:', error);
        setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!supabaseClient) {
      return { error: new Error('Supabase client not initialized') };
    }
    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, metadata?: Record<string, unknown>) => {
    if (!supabaseClient) {
      return { error: new Error('Supabase client not initialized') };
    }
    const redirectUrl = `${window.location.origin}/auth`;

    const { error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: metadata,
      },
    });
    return { error };
  };

  const signOut = async () => {
    if (!supabaseClient) {
      console.error('Supabase client not initialized');
      return;
    }
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    }
  };

  const updatePassword = async (newPassword: string) => {
    if (!supabaseClient) {
      return { error: new Error('Supabase client not initialized') };
    }
    const { error } = await supabaseClient.auth.updateUser({
      password: newPassword,
    });
    return { error };
  };

  const resendConfirmationEmail = async (email: string) => {
    if (!supabaseClient) {
      return { error: new Error('Supabase client not initialized') };
    }
    const redirectUrl = `${window.location.origin}/auth`;
    
    const { error } = await supabaseClient.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });
    return { error };
  };

  const signInWithMagicLink = async (email: string) => {
    if (!supabaseClient) {
      return { error: new Error('Supabase client not initialized') };
    }
    const redirectUrl = `${window.location.origin}/auth`;
    
    const { error } = await supabaseClient.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });
    return { error };
  };

  const value = {
    user,
    session,
    signIn,
    signUp,
    signOut,
    updatePassword,
    resendConfirmationEmail,
    signInWithMagicLink,
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
