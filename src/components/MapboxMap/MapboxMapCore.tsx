import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle } from 'lucide-react';
import { LocationData } from '@/types/PMScan';
import { useThresholds } from '@/contexts/ThresholdContext';
import { initializeMap } from '@/lib/mapbox/mapInitializer';
import { createLocationMarker } from '@/lib/mapbox/mapMarker';
import { updateTrackData, updateLayerStyles } from '@/lib/mapbox/mapLayers';
import { toggleMapStyle } from '@/lib/mapbox/mapStyleToggle';
import { MapboxMapControls } from './MapboxMapControls';

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
}

export const MapboxMapCore = ({
  currentLocation,
  pmData,
  trackPoints = [],
  isRecording = false,
  className,
}: MapboxMapCoreProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSatellite, setIsSatellite] = useState(false);
  const { thresholds, getAirQualityLevel } = useThresholds();

  // Initialize map (only once)
  useEffect(() => {
    const initMap = async () => {
      if (!mapContainer.current || map.current) return; // Prevent re-initialization

      setLoading(true);
      setError(null);

      const mapInstance = await initializeMap(
        mapContainer.current,
        currentLocation,
        thresholds,
        () => setLoading(false),
        (errorMsg) => {
          setError(errorMsg);
          setLoading(false);
        }
      );

      map.current = mapInstance;
    };

    initMap();

    return () => {
      if (map.current) {
        try {
          // Check if map is still valid before removing
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
  }, []); // Empty dependency array - only run once

  // Update marker when location changes
  useEffect(() => {
    if (!map.current || !currentLocation) return;

    marker.current = createLocationMarker(
      map.current,
      currentLocation,
      pmData,
      getAirQualityLevel,
      marker.current
    );
  }, [currentLocation, pmData, getAirQualityLevel]);

  // Update track visualization when trackPoints change
  useEffect(() => {
    if (!map.current || loading) return;
    
    // Ensure the map is loaded and sources exist before updating track data
    if (map.current.isStyleLoaded() && map.current.getSource('track-points')) {
      updateTrackData(map.current, trackPoints, isRecording);
    } else {
      // If map isn't ready yet, wait for it to load
      const handleStyleLoad = () => {
        if (map.current && map.current.getSource('track-points')) {
          updateTrackData(map.current, trackPoints, isRecording);
        }
      };
      
      if (map.current.isStyleLoaded()) {
        handleStyleLoad();
      } else {
        map.current.once('styledata', handleStyleLoad);
      }
    }
  }, [trackPoints, isRecording, loading]);

  // Update map styling when thresholds change
  useEffect(() => {
    if (!map.current) return;
    updateLayerStyles(map.current, thresholds);
  }, [thresholds]);

  // Toggle between satellite and map view
  const handleToggleMapStyle = () => {
    if (!map.current) return;

    toggleMapStyle(
      map.current,
      isSatellite,
      trackPoints,
      thresholds,
      setIsSatellite
    );
  };

  if (error) {
    return (
      <Card className={`p-6 ${className || ''}`}>
        <div className="flex flex-col items-center justify-center h-full text-center">
          <AlertTriangle className="h-8 w-8 text-destructive mb-3" />
          <p className="text-sm text-muted-foreground mb-2">{error}</p>
          <Badge variant="destructive" className="text-xs">
            Map Unavailable
          </Badge>
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
            <p className="text-sm text-muted-foreground">Loading map...</p>
          </div>
        </div>
      )}

      <div
        ref={mapContainer}
        className="w-full h-full rounded-lg overflow-hidden"
      />

      <MapboxMapControls
        isSatellite={isSatellite}
        onToggleMapStyle={handleToggleMapStyle}
        currentLocation={currentLocation}
      />
    </div>
  );
};
