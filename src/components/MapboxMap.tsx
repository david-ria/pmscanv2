import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, AlertTriangle } from "lucide-react";
import { LocationData } from "@/types/PMScan";

interface MapboxMapProps {
  currentLocation?: LocationData | null;
  pmData?: {
    pm1: number;
    pm25: number;
    pm10: number;
    timestamp: Date;
  } | null;
  className?: string;
}

export const MapboxMap = ({ currentLocation, pmData, className }: MapboxMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize map
  useEffect(() => {
    const initializeMap = async () => {
      if (!mapContainer.current) return;

      try {
        setLoading(true);
        setError(null);

        // Get Mapbox token from edge function
        const { data, error: tokenError } = await supabase.functions.invoke('get-mapbox-token');
        
        if (tokenError || !data?.token) {
          throw new Error('Failed to get Mapbox token');
        }

        mapboxgl.accessToken = data.token;
        
        // Initialize map
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/light-v11',
          center: currentLocation ? [currentLocation.longitude, currentLocation.latitude] : [2.3522, 48.8566], // Default to Paris
          zoom: currentLocation ? 15 : 10,
          pitch: 0,
        });

        // Add navigation controls
        map.current.addControl(
          new mapboxgl.NavigationControl({
            visualizePitch: true,
          }),
          'top-right'
        );

        // Add scale control
        map.current.addControl(new mapboxgl.ScaleControl({
          maxWidth: 80,
          unit: 'metric'
        }));

        map.current.on('load', () => {
          setLoading(false);
        });

        map.current.on('error', (e) => {
          console.error('Map error:', e);
          setError('Map failed to load');
          setLoading(false);
        });

      } catch (err) {
        console.error('Failed to initialize map:', err);
        setError('Failed to initialize map. Please check your connection.');
        setLoading(false);
      }
    };

    initializeMap();

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, []);

  // Update marker when location changes
  useEffect(() => {
    if (!map.current || !currentLocation) return;

    const { longitude, latitude } = currentLocation;

    // Remove existing marker
    if (marker.current) {
      marker.current.remove();
    }

    // Create popup content with PM data if available
    let popupContent = `
      <div style="font-family: system-ui; padding: 8px;">
        <div style="font-weight: bold; margin-bottom: 8px; display: flex; align-items: center; gap: 4px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          PMScan Location
        </div>
        <div style="font-size: 12px; color: #666; margin-bottom: 8px;">
          <div>Lat: ${latitude.toFixed(6)}°</div>
          <div>Lng: ${longitude.toFixed(6)}°</div>
          <div>Accuracy: ±${currentLocation.accuracy.toFixed(0)}m</div>
        </div>`;

    if (pmData) {
      const getQualityColor = (pm25: number) => {
        if (pm25 <= 12) return '#22c55e'; // green
        if (pm25 <= 35) return '#eab308'; // yellow
        if (pm25 <= 55) return '#f97316'; // orange
        return '#ef4444'; // red
      };

      popupContent += `
        <div style="border-top: 1px solid #e5e7eb; padding-top: 8px;">
          <div style="font-weight: bold; margin-bottom: 4px;">Air Quality</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; font-size: 11px;">
            <div style="text-align: center;">
              <div style="font-weight: bold;">${Math.round(pmData.pm1)}</div>
              <div style="color: #666;">PM1</div>
            </div>
            <div style="text-align: center; color: ${getQualityColor(pmData.pm25)};">
              <div style="font-weight: bold;">${Math.round(pmData.pm25)}</div>
              <div>PM2.5</div>
            </div>
            <div style="text-align: center;">
              <div style="font-weight: bold;">${Math.round(pmData.pm10)}</div>
              <div style="color: #666;">PM10</div>
            </div>
          </div>
          <div style="font-size: 10px; color: #666; margin-top: 4px; text-align: center;">
            ${pmData.timestamp.toLocaleTimeString()}
          </div>
        </div>`;
    }

    popupContent += '</div>';

    // Create new marker
    marker.current = new mapboxgl.Marker({
      color: pmData ? '#3b82f6' : '#6b7280',
      scale: 0.8
    })
      .setLngLat([longitude, latitude])
      .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(popupContent))
      .addTo(map.current);

    // Center map on new location
    map.current.flyTo({
      center: [longitude, latitude],
      zoom: 15,
      duration: 1500
    });

  }, [currentLocation, pmData]);

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
      
      {currentLocation && (
        <div className="absolute bottom-3 left-3 bg-background/90 backdrop-blur-sm p-2 rounded-md border border-border">
          <div className="flex items-center gap-2 text-xs">
            <MapPin className="h-3 w-3 text-primary" />
            <span className="text-muted-foreground">
              ±{currentLocation.accuracy.toFixed(0)}m accuracy
            </span>
          </div>
        </div>
      )}
    </div>
  );
};