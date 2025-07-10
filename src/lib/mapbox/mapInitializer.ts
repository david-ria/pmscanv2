import mapboxgl from 'mapbox-gl';
import { supabase } from "@/integrations/supabase/client";
import { LocationData } from "@/types/PMScan";
import { addTrackDataSources, addTrackLayers } from './mapLayers';
import { addTrackPointEventListeners } from './mapEventHandlers';
import { MAP_STYLES } from './mapStyles';
import { loadMapState, setupMapStatePersistence } from './mapPersistence';

export const initializeMap = async (
  container: HTMLDivElement,
  currentLocation: LocationData | null,
  thresholds: any,
  onLoad: () => void,
  onError: (error: string) => void
): Promise<mapboxgl.Map | null> => {
  try {
    console.log('🗺️ Starting map initialization...');
    console.log('🗺️ Container element:', container);
    console.log('🗺️ Current location:', currentLocation);
    
    console.log('🗺️ Step 1: Requesting Mapbox token from edge function...');
    const { data, error: tokenError } = await supabase.functions.invoke('get-mapbox-token');
    
    console.log('🗺️ Step 2: Edge function response received:', { data, error: tokenError });
    
    if (tokenError) {
      console.error('🗺️ ❌ Edge function error:', tokenError);
      throw new Error(`Edge function error: ${tokenError.message || tokenError}`);
    }
    
    if (!data?.token) {
      console.error('🗺️ ❌ No token in response:', data);
      throw new Error('No Mapbox token received from edge function');
    }
    
    console.log('🗺️ ✅ Successfully received Mapbox token');
    console.log('🗺️ Token length:', data.token?.length);

    console.log('🗺️ Step 3: Setting Mapbox access token...');
    mapboxgl.accessToken = data.token;
    
    console.log('🗺️ Step 4: Determining map initial state...');
    
    // Determine initial map state - prioritize current location, then saved state, then default
    let center: [number, number];
    let zoom: number;
    let pitch: number = 0;
    
    if (currentLocation) {
      // Priority 1: Use current location if available
      center = [currentLocation.longitude, currentLocation.latitude];
      zoom = 15;
      console.log('🗺️ Using current location for map center');
    } else {
      // Priority 2: Try to load saved state
      const savedState = loadMapState();
      if (savedState) {
        center = savedState.center;
        zoom = savedState.zoom;
        pitch = savedState.pitch;
        console.log('🗺️ Using saved map state:', savedState);
      } else {
        // Priority 3: Default to Paris
        center = [2.3522, 48.8566];
        zoom = 10;
        console.log('🗺️ Using default map center (Paris)');
      }
    }
    
    console.log('🗺️ Step 5: Creating Mapbox map instance...');
    console.log('🗺️ Map style:', MAP_STYLES.LIGHT);
    console.log('🗺️ Map center:', center);
    console.log('🗺️ Map zoom:', zoom);
    console.log('🗺️ Map pitch:', pitch);
    
    // Initialize map
    const map = new mapboxgl.Map({
      container,
      style: MAP_STYLES.LIGHT,
      center,
      zoom,
      pitch,
    });

    console.log('🗺️ ✅ Map instance created successfully');
    console.log('🗺️ Map object:', map);

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
      
      // Set up map state persistence after the map is loaded
      setupMapStatePersistence(map);
      console.log('🗺️ ✅ Map state persistence setup complete');
      
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