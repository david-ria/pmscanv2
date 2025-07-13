import mapboxgl from 'mapbox-gl';
import { supabase } from "@/integrations/supabase/client";
import { LocationData } from "@/types/PMScan";
import { addTrackDataSources, addTrackLayers } from './mapLayers';
import { addTrackPointEventListeners } from './mapEventHandlers';
import { MAP_STYLES } from './mapStyles';
import { loadMapState, setupMapStatePersistence } from './mapPersistence';
import * as logger from '@/utils/logger';

export const initializeMap = async (
  container: HTMLDivElement,
  currentLocation: LocationData | null,
  thresholds: any,
  onLoad: () => void,
  onError: (error: string) => void
): Promise<mapboxgl.Map | null> => {
  try {
    logger.debug('🗺️ Starting map initialization...');
    logger.debug('🗺️ Container element:', container);
    logger.debug('🗺️ Current location:', currentLocation);
    
    logger.debug('🗺️ Step 1: Requesting Mapbox token from edge function...');
    const { data, error: tokenError } = await supabase.functions.invoke('get-mapbox-token');
    
    logger.debug('🗺️ Step 2: Edge function response received:', { data, error: tokenError });
    
    if (tokenError) {
      console.error('🗺️ ❌ Edge function error:', tokenError);
      throw new Error(`Edge function error: ${tokenError.message || tokenError}`);
    }
    
    if (!data?.token) {
      console.error('🗺️ ❌ No token in response:', data);
      throw new Error('No Mapbox token received from edge function');
    }
    
    logger.debug('🗺️ ✅ Successfully received Mapbox token');
    logger.debug('🗺️ Token length:', data.token?.length);

    logger.debug('🗺️ Step 3: Setting Mapbox access token...');
    mapboxgl.accessToken = data.token;
    
    logger.debug('🗺️ Step 4: Determining map initial state...');
    
    // Determine initial map state - prioritize current location, then saved state, then default
    let center: [number, number];
    let zoom: number;
    let pitch: number = 0;
    
    if (currentLocation) {
      // Priority 1: Use current location if available
      center = [currentLocation.longitude, currentLocation.latitude];
      zoom = 15;
      logger.debug('🗺️ Using current location for map center');
    } else {
      // Priority 2: Try to load saved state
      const savedState = loadMapState();
      if (savedState) {
        center = savedState.center;
        zoom = savedState.zoom;
        pitch = savedState.pitch;
        logger.debug('🗺️ Using saved map state:', savedState);
      } else {
        // Priority 3: Default to Paris
        center = [2.3522, 48.8566];
        zoom = 10;
        logger.debug('🗺️ Using default map center (Paris)');
      }
    }
    
    logger.debug('🗺️ Step 5: Creating Mapbox map instance...');
    logger.debug('🗺️ Map style:', MAP_STYLES.LIGHT);
    logger.debug('🗺️ Map center:', center);
    logger.debug('🗺️ Map zoom:', zoom);
    logger.debug('🗺️ Map pitch:', pitch);
    
    // Initialize map
    const map = new mapboxgl.Map({
      container,
      style: MAP_STYLES.LIGHT,
      center,
      zoom,
      pitch,
    });

    logger.debug('🗺️ ✅ Map instance created successfully');
    logger.debug('🗺️ Map object:', map);

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
      logger.debug('🗺️ ✅ Map state persistence setup complete');
      
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