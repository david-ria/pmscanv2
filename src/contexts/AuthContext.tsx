import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';

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
    // Dynamically import supabase to avoid initialization issues
    let subscription: any;
    
    const initAuth = async () => {
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        
        // Set up auth state listener
        const {
          data: { subscription: sub },
        } = supabase.auth.onAuthStateChange((event, session) => {
          console.log('Auth state change:', event, !!session?.user);
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        });
        
        subscription = sub;

        // Check for existing session
        const { data: { session } } = await supabase.auth.getSession();
        console.log('Initial session check:', !!session?.user);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      } catch (error) {
        console.error('Auth initialization error:', error);
        setLoading(false);
      }
    };

    initAuth();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (importError) {
      return { error: importError };
    }
  };

  const signUp = async (email: string, password: string, metadata?: any) => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const redirectUrl = `${window.location.origin}/`;

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: metadata,
        },
      });
      return { error };
    } catch (importError) {
      return { error: importError };
    }
  };

  const signOut = async () => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
      }
    } catch (importError) {
      console.error('Error importing supabase during signOut:', importError);
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      return { error };
    } catch (importError) {
      return { error: importError };
    }
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
