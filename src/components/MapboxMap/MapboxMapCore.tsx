import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { initializeMap } from '@/lib/mapbox/mapInitializer';
import type { LocationData } from '@/types/PMScan';
import type { PMScanData } from '@/lib/pmscan/types';

interface TrackPoint {
  longitude: number;
  latitude: number;
  pm25: number;
  timestamp: Date;
}

interface MapboxMapCoreProps {
  currentLocation?: LocationData | null;
  thresholds?: unknown;
  onMapError?: (error: string) => void;
  pmData?: PMScanData;
  trackPoints?: TrackPoint[];
  isRecording?: boolean;
  className?: string;
  autoLoadOnRecording?: boolean;
}

export default function MapboxMapCore({ 
  currentLocation, 
  thresholds, 
  onMapError,
  pmData,
  trackPoints,
  isRecording,
  className,
  autoLoadOnRecording
}: MapboxMapCoreProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Auto-load map when recording starts if autoLoadOnRecording is true
  useEffect(() => {
    console.log('🗺️ MapboxMapCore auto-load effect:', { 
      autoLoadOnRecording, 
      isRecording, 
      mapLoaded,
      willTrigger: autoLoadOnRecording && isRecording && !mapLoaded 
    });
    
    if (autoLoadOnRecording && isRecording && !mapLoaded) {
      console.log('🗺️ Auto-loading map due to recording start');
      handleLoadMap();
    }
  }, [autoLoadOnRecording, isRecording, mapLoaded]);

  const handleLoadMap = async () => {
    if (!mapContainer.current || mapLoaded) {
      console.log('🗺️ Skipping map load:', { 
        hasContainer: !!mapContainer.current, 
        mapLoaded 
      });
      return;
    }
    
    console.log('🗺️ Starting map initialization...');
    setIsLoading(true);
    
    try {
      const map = await initializeMap(mapContainer.current, {
        currentLocation,
        thresholds
      });
      console.log('🗺️ Map initialized successfully:', map);
      setMapLoaded(true);
    } catch (error) {
      console.error('🗺️ Failed to initialize map:', error);
      onMapError?.(error instanceof Error ? error.message : 'Map initialization failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (!mapLoaded) {
    return (
      <div className={`h-64 flex flex-col items-center justify-center space-y-4 ${className || ''}`}>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <>
            <p className="text-muted-foreground">Map not loaded</p>
            <Button onClick={handleLoadMap} disabled={isLoading}>
              Load Map
            </Button>
          </>
        )}
      </div>
    );
  }

  return <div ref={mapContainer} className={`h-64 w-full ${className || ''}`} />;
}

export { MapboxMapCore };