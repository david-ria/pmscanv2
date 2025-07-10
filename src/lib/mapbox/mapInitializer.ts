import mapboxgl from 'mapbox-gl';
import { supabase } from "@/integrations/supabase/client";
import { LocationData } from "@/types/PMScan";
import { addTrackDataSources, addTrackLayers } from './mapLayers';
import { addTrackPointEventListeners } from './mapEventHandlers';
import { MAP_STYLES } from './mapStyles';

export const initializeMap = async (
  container: HTMLDivElement,
  currentLocation: LocationData | null,
  thresholds: any,
  onLoad: () => void,
  onError: (error: string) => void
): Promise<mapboxgl.Map | null> => {
  try {
    console.log('Requesting Mapbox token from edge function...');
    const { data, error: tokenError } = await supabase.functions.invoke('get-mapbox-token');
    
    console.log('Edge function response:', { data, error: tokenError });
    
    if (tokenError) {
      console.error('Edge function error:', tokenError);
      throw new Error(`Edge function error: ${tokenError.message || tokenError}`);
    }
    
    if (!data?.token) {
      console.error('No token in response:', data);
      throw new Error('No Mapbox token received from edge function');
    }
    
    console.log('Successfully received Mapbox token');

    mapboxgl.accessToken = data.token;
    
    // Initialize map
    const map = new mapboxgl.Map({
      container,
      style: MAP_STYLES.LIGHT,
      center: currentLocation ? [currentLocation.longitude, currentLocation.latitude] : [2.3522, 48.8566], // Default to Paris
      zoom: currentLocation ? 15 : 10,
      pitch: 0,
    });

    // Add navigation controls
    map.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
      'top-right'
    );

    // Add scale control
    map.addControl(new mapboxgl.ScaleControl({
      maxWidth: 80,
      unit: 'metric'
    }));

    map.on('load', () => {
      addTrackDataSources(map);
      addTrackLayers(map, thresholds);
      addTrackPointEventListeners(map);
      onLoad();
    });

    map.on('error', (e) => {
      console.error('Map error:', e);
      onError('Map failed to load');
    });

    return map;

  } catch (err) {
    console.error('Failed to initialize map:', err);
    onError('Failed to initialize map. Please check your connection.');
    return null;
  }
};