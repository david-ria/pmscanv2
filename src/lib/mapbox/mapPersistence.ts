import mapboxgl from 'mapbox-gl';

interface MapState {
  center: [number, number];
  zoom: number;
  pitch: number;
}

const MAP_STATE_KEY = 'pmscan_map_state';

export const saveMapState = (map: mapboxgl.Map) => {
  try {
    const state: MapState = {
      center: [map.getCenter().lng, map.getCenter().lat],
      zoom: map.getZoom(),
      pitch: map.getPitch(),
    };
    localStorage.setItem(MAP_STATE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Failed to save map state:', error);
  }
};

export const loadMapState = (): MapState | null => {
  try {
    const savedState = localStorage.getItem(MAP_STATE_KEY);
    if (savedState) {
      const state = JSON.parse(savedState) as MapState;
      // Validate the state has required properties
      if (
        state.center &&
        state.zoom !== undefined &&
        state.pitch !== undefined
      ) {
        return state;
      }
    }
  } catch (error) {
    console.warn('Failed to load map state:', error);
  }
  return null;
};

export const setupMapStatePersistence = (map: mapboxgl.Map) => {
  // Save state when the map stops moving
  const saveState = () => saveMapState(map);

  map.on('moveend', saveState);
  map.on('zoomend', saveState);
  map.on('pitchend', saveState);

  // Return cleanup function
  return () => {
    map.off('moveend', saveState);
    map.off('zoomend', saveState);
    map.off('pitchend', saveState);
  };
};
