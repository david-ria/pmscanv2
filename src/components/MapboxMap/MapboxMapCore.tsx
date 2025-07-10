import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle } from "lucide-react";
import { LocationData } from "@/types/PMScan";
import { useThresholds } from "@/contexts/ThresholdContext";
import { initializeMap } from "@/lib/mapbox/mapInitializer";
import { createLocationMarker } from "@/lib/mapbox/mapMarker";
import { updateTrackData, updateLayerStyles } from "@/lib/mapbox/mapLayers";
import { toggleMapStyle } from "@/lib/mapbox/mapStyleToggle";
import { MapboxMapControls } from "./MapboxMapControls";

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
  className 
}: MapboxMapCoreProps) => {

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSatellite, setIsSatellite] = useState(false);
  const { thresholds, getAirQualityLevel } = useThresholds();

  // Initialize map
  useEffect(() => {
    const initMap = async () => {
      console.log('🗺️ MapboxMapCore: Starting map initialization useEffect');
      console.log('🗺️ MapboxMapCore: mapContainer.current:', mapContainer.current);
      
      if (!mapContainer.current) {
        console.log('🗺️ MapboxMapCore: ❌ No map container found, aborting');
        return;
      }

      console.log('🗺️ MapboxMapCore: Setting loading state to true');
      setLoading(true);
      setError(null);

      console.log('🗺️ MapboxMapCore: Calling initializeMap...');
      const mapInstance = await initializeMap(
        mapContainer.current,
        currentLocation,
        thresholds,
        () => {
          console.log('🗺️ MapboxMapCore: ✅ Map loaded successfully');
          setLoading(false);
        },
        (errorMsg) => {
          console.log('🗺️ MapboxMapCore: ❌ Map loading failed:', errorMsg);
          setError(errorMsg);
          setLoading(false);
        }
      );

      console.log('🗺️ MapboxMapCore: Map instance result:', mapInstance);
      map.current = mapInstance;
    };

    initMap();

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, [currentLocation?.latitude, currentLocation?.longitude, thresholds]);

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
  }, [currentLocation, pmData, thresholds]);

  // Update track visualization when trackPoints change
  useEffect(() => {
    if (!map.current) return;
    updateTrackData(map.current, trackPoints, isRecording);
  }, [trackPoints, isRecording]);

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
      
      <div ref={mapContainer} className="w-full h-full rounded-lg overflow-hidden" />
      
      <MapboxMapControls
        isSatellite={isSatellite}
        onToggleMapStyle={handleToggleMapStyle}
        currentLocation={currentLocation}
      />
    </div>
  );
};