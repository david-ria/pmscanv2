import React, { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, Map as MapIcon } from 'lucide-react';
import { LocationData } from '@/types/PMScan';
import { useThresholds } from '@/contexts/ThresholdContext';

// Dynamic imports - no static imports for mapbox or related modules
// These will be loaded only when the map is actually requested

interface MapboxMapCoreProps {
  currentLocation?: LocationData | null;
  pmData?: {
    pm1: number;
    pm25: number;
    pm10: number;
    timestamp: Date;
  } | null;
  trackPoints?: Array<{
    longitude: number;
    latitude: number;
    pm25: number;
    timestamp: Date;
  }>;
  isRecording?: boolean;
  className?: string;
  autoLoadOnRecording?: boolean;
}

export const MapboxMapCore = ({
  currentLocation,
  pmData,
  trackPoints = [],
  isRecording = false,
  className,
  autoLoadOnRecording = false,
}: MapboxMapCoreProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const marker = useRef<any>(null);
  const [mapboxLoaded, setMapboxLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSatellite, setIsSatellite] = useState(false);
  const [userRequested, setUserRequested] = useState(false);
  const { thresholds, getAirQualityLevel } = useThresholds();

  // Lazy load mapbox modules and utilities
  const loadMapboxModules = async () => {
    const [
      { initializeMap },
      { createLocationMarker },
      { updateTrackData, updateLayerStyles },
      { toggleMapStyle },
      MapboxMapControls
    ] = await Promise.all([
      import('@/lib/mapbox/mapInitializer'),
      import('@/lib/mapbox/mapMarker'),
      import('@/lib/mapbox/mapLayers'),
      import('@/lib/mapbox/mapStyleToggle'),
      import('./MapboxMapControls').then(m => m.MapboxMapControls)
    ]);
    
    return {
      initializeMap,
      createLocationMarker,
      updateTrackData,
      updateLayerStyles,
      toggleMapStyle,
      MapboxMapControls
    };
  };

  // Handler for user-initiated map loading
  const handleLoadMap = async () => {
    if (!mapContainer.current || map.current || loading) return;

    setLoading(true);
    setError(null);
    setUserRequested(true);

    try {
      console.debug('[PERF] 🗺️ User requested map - loading Mapbox GL...');
      
      // Load all mapbox modules dynamically
      const modules = await loadMapboxModules();
      
      const mapInstance = await modules.initializeMap(
        mapContainer.current,
        currentLocation,
        thresholds,
        () => {
          setLoading(false);
          setMapboxLoaded(true);
          console.debug('[PERF] ✅ Mapbox GL fully loaded and initialized');
        },
        (errorMsg) => {
          setError(errorMsg);
          setLoading(false);
        }
      );

      map.current = mapInstance;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load map';
      setError(errorMsg);
      setLoading(false);
      console.error('[PERF] ❌ Failed to load Mapbox GL:', err);
    }
  };

  // Auto-load map based on context
  useEffect(() => {
    const recordingConfirmed = localStorage.getItem('recording-confirmed') === 'true';
    
    console.debug('[PERF] 🗺️ Map auto-load check:', {
      autoLoadOnRecording,
      isRecording,
      recordingConfirmed,
      trackPointsLength: trackPoints.length,
      mapboxLoaded,
      loading,
      userRequested
    });
    
    // Only load map if recording is active AND frequency has been selected
    if (autoLoadOnRecording && isRecording && recordingConfirmed && !mapboxLoaded && !loading) {
      console.debug('[PERF] 🎬 Recording confirmed after frequency selection - auto-loading map...');
      handleLoadMap();
      // Clear the flag after use
      localStorage.removeItem('recording-confirmed');
      return;
    }

    // Auto-load for historical data viewing (when trackPoints exist and not recording)
    if (trackPoints.length > 0 && !isRecording && !mapboxLoaded && !loading) {
      console.debug('[PERF] 📊 Historical data detected - auto-loading map for', trackPoints.length, 'points...');
      handleLoadMap();
      return;
    }

    // Auto-load if user has previously interacted with the map OR if recording is active
    const shouldAutoLoad = localStorage.getItem('mapbox-user-preference') === 'enabled';
    if ((shouldAutoLoad || isRecording) && !mapboxLoaded && !loading) {
      console.debug('[PERF] 🔄 Auto-loading map for recording or returning user...');
      handleLoadMap();
    }
  }, [autoLoadOnRecording, isRecording, trackPoints.length, mapboxLoaded, userRequested, loading]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (map.current) {
        try {
          if (map.current.getContainer()) {
            map.current.remove();
          }
        } catch (error) {
          console.warn('Error removing map:', error);
        } finally {
          map.current = null;
        }
      }
    };
  }, []);

  // Update marker when location changes (only if map is loaded)
  useEffect(() => {
    console.log('🗺️ === MAP LOCATION UPDATE ===', {
      hasMap: !!map.current,
      hasCurrentLocation: !!currentLocation,
      mapboxLoaded,
      currentLocation: currentLocation ? {
        lat: currentLocation.latitude,
        lng: currentLocation.longitude,
        accuracy: currentLocation.accuracy
      } : null
    });

    if (!map.current || !currentLocation || !mapboxLoaded) {
      console.log('🗺️ Skipping marker update - missing requirements');
      return;
    }

    (async () => {
      console.log('🗺️ Creating location marker for:', {
        lat: currentLocation.latitude,
        lng: currentLocation.longitude,
        pm25: pmData?.pm25
      });
      const { createLocationMarker } = await import('@/lib/mapbox/mapMarker');
      marker.current = createLocationMarker(
        map.current,
        currentLocation,
        pmData,
        getAirQualityLevel,
        marker.current
      );
      console.log('🗺️ Location marker created successfully');
    })();
  }, [currentLocation, pmData, getAirQualityLevel, mapboxLoaded]);

  // Update track visualization when trackPoints change (only if map is loaded)
  useEffect(() => {
    if (!map.current || !mapboxLoaded) return;
    
    (async () => {
      const { updateTrackData } = await import('@/lib/mapbox/mapLayers');
      updateTrackData(map.current, trackPoints, isRecording);
    })();
  }, [trackPoints, isRecording, mapboxLoaded]);

  // Update map styling when thresholds change (only if map is loaded)
  useEffect(() => {
    if (!map.current || !mapboxLoaded) return;
    
    (async () => {
      const { updateLayerStyles } = await import('@/lib/mapbox/mapLayers');
      updateLayerStyles(map.current, thresholds);
    })();
  }, [thresholds, mapboxLoaded]);

  // Toggle between satellite and map view
  const handleToggleMapStyle = async () => {
    if (!map.current || !mapboxLoaded) return;

    const { toggleMapStyle } = await import('@/lib/mapbox/mapStyleToggle');
    toggleMapStyle(
      map.current,
      isSatellite,
      trackPoints,
      thresholds,
      setIsSatellite
    );
  };

  // Save user preference when they first load the map or when recording starts
  const handleUserMapLoad = () => {
    localStorage.setItem('mapbox-user-preference', 'enabled');
    handleLoadMap();
  };

  if (error) {
    return (
      <Card className={`p-6 ${className || ''}`}>
        <div className="flex flex-col items-center justify-center h-full text-center">
          <AlertTriangle className="h-8 w-8 text-destructive mb-3" />
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button 
            variant="outline" 
            onClick={handleLoadMap}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Retrying...
              </>
            ) : (
              'Retry Map Load'
            )}
          </Button>
        </div>
      </Card>
    );
  }

  // Show map load button if map hasn't been loaded yet AND not recording AND no track points
  if (!mapboxLoaded && !isRecording && trackPoints.length === 0) {
    return (
      <Card className={`p-6 ${className || ''}`}>
        <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
          <div className="p-4 rounded-full bg-primary/10">
            <MapIcon className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold mb-2">Interactive Map</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Load the map to visualize air quality data and track your location
            </p>
            <Badge variant="secondary" className="text-xs mb-4">
              ~2MB • Loads on demand
            </Badge>
          </div>
          <Button onClick={handleUserMapLoad}>
            <MapIcon className="h-4 w-4 mr-2" />
            Load Map
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className={`relative ${className || ''}`}>
      {loading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading interactive map...</p>
            <Badge variant="secondary" className="text-xs">
              Loading Mapbox GL (~2MB)
            </Badge>
          </div>
        </div>
      )}

      <div
        ref={mapContainer}
        className="w-full h-full rounded-lg overflow-hidden"
      />

      {mapboxLoaded && (
        <React.Suspense fallback={<div>Loading controls...</div>}>
          {/* Lazy load controls only when map is ready */}
          <LazyMapControls
            isSatellite={isSatellite}
            onToggleMapStyle={handleToggleMapStyle}
            currentLocation={currentLocation}
          />
        </React.Suspense>
      )}
    </div>
  );
};

// Lazy-loaded map controls component
const LazyMapControls = React.lazy(async () => {
  const { MapboxMapControls } = await import('./MapboxMapControls');
  return { default: MapboxMapControls };
});
