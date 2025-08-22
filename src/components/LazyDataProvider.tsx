/**
 * Lazy Data Provider - loads Supabase only when needed
 * Use this instead of importing supabase client directly
 */

import { createContext, useContext, ReactNode } from 'react';
import { useSupabaseLazy } from '@/lib/supabaseWrapper';
import { Skeleton } from '@/components/ui/skeleton';

interface LazyDataContextType {
  supabase: {
    from: (table: string) => any;
    auth: any;
    storage: any;
    [key: string]: unknown;
  };
  loading: boolean;
  error: Error | null;
}

const LazyDataContext = createContext<LazyDataContextType | null>(null);

interface LazyDataProviderProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function LazyDataProvider({ children, fallback }: LazyDataProviderProps) {
  const { supabase, loading, error } = useSupabaseLazy();

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-2">
          <p className="text-sm text-destructive">Failed to load data services</p>
          <p className="text-xs text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return fallback || (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      </div>
    );
  }

  return (
    <LazyDataContext.Provider value={{ supabase, loading, error }}>
      {children}
    </LazyDataContext.Provider>
  );
}

/**
 * Hook to access lazy-loaded Supabase client
 */
export function useLazyData() {
  const context = useContext(LazyDataContext);
  if (!context) {
    throw new Error('useLazyData must be used within a LazyDataProvider');
  }
  return context;
}

/**
 * Higher-order component for components that need data access
 */
export function withLazyData<P extends object>(
  Component: React.ComponentType<P>
) {
  return function LazyDataWrapper(props: P) {
    return (
      <LazyDataProvider>
        <Component {...props} />
      </LazyDataProvider>
    );
  };
}