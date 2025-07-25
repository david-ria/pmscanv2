/**
 * Example component showing how to use lazy-loaded Mapbox and Supabase
 * Replace direct imports with this pattern for heavy libraries
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { LazyMapboxWrapper } from './LazyMapboxWrapper';
import { Skeleton } from '@/components/ui/skeleton';

interface MapboxLazyLoaderProps {
  onMapReady?: (map: any) => void;
  className?: string;
}

export function MapboxLazyLoader({ onMapReady, className }: MapboxLazyLoaderProps) {
  const [mapToken, setMapToken] = useState<string>('');

  const handleMapLoad = useCallback((mapbox: any, supabase: any) => {
    console.debug('[PERF] Map and data ready for use');
    
    // Example: Fetch Mapbox token from Supabase edge function
    const fetchMapToken = async () => {
      try {
        const { data } = await supabase.functions.invoke('get-mapbox-token');
        setMapToken(data?.token || '');
      } catch (error) {
        console.error('Failed to fetch map token:', error);
      }
    };

    fetchMapToken();

    // Example map initialization would go here
    // const map = new mapbox.Map({...})
    // onMapReady?.(map);
  }, [onMapReady]);

  return (
    <div className={className}>
      <LazyMapboxWrapper
        fallback={
          <div className="space-y-3">
            <Skeleton className="h-64 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
        }
        onLoadStart={() => console.debug('[PERF] Starting map load...')}
        onLoadComplete={() => console.debug('[PERF] Map load complete')}
        onError={(error) => console.error('[PERF] Map load failed:', error)}
      >
        {(mapbox, supabase) => {
          // Once loaded, render the actual map component
          handleMapLoad(mapbox, supabase);
          
          return (
            <div className="space-y-4">
              <div className="h-64 bg-muted/20 rounded-lg border-2 border-dashed border-muted flex items-center justify-center">
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    🗺️ Map ready (token: {mapToken ? '✓' : '⏳'})
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Mapbox GL and Supabase loaded dynamically
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={() => console.log('Map interaction with:', { mapbox, supabase })}
                >
                  Test Map
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => console.log('Data interaction with:', { supabase })}
                >
                  Test Data
                </Button>
              </div>
            </div>
          );
        }}
      </LazyMapboxWrapper>
    </div>
  );
}

/**
 * Usage example for other components:
 * 
 * // Instead of:
 * import mapboxgl from 'mapbox-gl';
 * import { supabase } from '@/integrations/supabase/client';
 * 
 * // Use:
 * import { loadMapAndData } from '@/lib/dynamicImports';
 * 
 * const MyComponent = () => {
 *   const handleMapNeeded = async () => {
 *     const { mapbox, supabase } = await loadMapAndData();
 *     // Use mapbox and supabase here
 *   };
 * };
 */