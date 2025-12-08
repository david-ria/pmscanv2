/**
 * Lazy Mapbox wrapper component
 * Loads Mapbox GL only when map is actually needed
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { loadMapboxGL } from '@/lib/dynamicImports';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

interface LazyMapboxWrapperProps {
  children: (mapbox: any, supabase: any) => React.ReactNode;
  fallback?: React.ReactNode;
  onLoadStart?: () => void;
  onLoadComplete?: () => void;
  onError?: (error: Error) => void;
}

export function LazyMapboxWrapper({
  children,
  fallback,
  onLoadStart,
  onLoadComplete,
  onError,
}: LazyMapboxWrapperProps) {
  const [mapbox, setMapbox] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const loadingRef = useRef(false);

  const loadMapboxResources = useCallback(async () => {
    if (loadingRef.current || mapbox) return;
    
    loadingRef.current = true;
    setLoading(true);
    onLoadStart?.();

    try {
      console.debug('[PERF] Starting Mapbox lazy load...');
      const mapboxInstance = await loadMapboxGL();
      
      setMapbox(mapboxInstance);
      setError(null);
      
      console.debug('[PERF] Mapbox lazy load complete');
      onLoadComplete?.();
    } catch (err) {
      const error = err as Error;
      console.error('[PERF] Mapbox lazy load failed:', error);
      setError(error);
      onError?.(error);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [mapbox, onLoadStart, onLoadComplete, onError]);

  useEffect(() => {
    // Auto-load when component mounts
    loadMapboxResources();
  }, [loadMapboxResources]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 bg-muted/20 rounded-lg border-2 border-dashed border-muted">
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">Failed to load map</p>
          <button 
            onClick={loadMapboxResources}
            className="text-xs text-primary hover:underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (loading || !mapbox) {
    return fallback || (
      <div className="space-y-3">
        <Skeleton className="h-64 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
    );
  }

  return <>{children(mapbox, supabase)}</>;
}

/**
 * Hook for manual map loading trigger
 */
export function useMapboxLazyLoad() {
  const [state, setState] = useState({
    mapbox: null as any,
    loading: false,
    error: null as Error | null,
  });

  const loadMap = useCallback(async () => {
    if (state.loading || state.mapbox) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const mapbox = await loadMapboxGL();
      setState({
        mapbox,
        loading: false,
        error: null,
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error as Error,
      }));
    }
  }, [state.loading, state.mapbox]);

  return {
    ...state,
    supabase,
    loadMap,
  };
}