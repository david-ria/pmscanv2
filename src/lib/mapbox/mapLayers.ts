import { createMapStyleExpression } from './mapStyles';

// Dynamic import types for better tree shaking
type MapboxMap = any;

export const addTrackDataSources = (map: MapboxMap) => {
  // Add data sources for track visualization only if they don't exist
  if (!map.getSource('track-line')) {
    map.addSource('track-line', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [],
        },
      },
    });
  }

  if (!map.getSource('track-points')) {
    map.addSource('track-points', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [],
      },
    });
  }
};

export const addTrackLayers = (map: MapboxMap, thresholds: any) => {
  // Add track line layer only if it doesn't exist
  if (!map.getLayer('track-line')) {
    map.addLayer({
      id: 'track-line',
      type: 'line',
      source: 'track-line',
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': '#3b82f6',
        'line-width': 3,
        'line-opacity': 0.8,
      },
    });
  }

  // Add track points layer only if it doesn't exist
  if (!map.getLayer('track-points')) {
    map.addLayer({
      id: 'track-points',
      type: 'circle',
      source: 'track-points',
      paint: {
        'circle-radius': [
          'case',
          ['boolean', ['feature-state', 'hovered'], false],
          8,
          6,
        ],
        'circle-color': createMapStyleExpression(thresholds),
        'circle-stroke-width': 0,
        'circle-stroke-color': 'transparent',
        'circle-opacity': 1,
      },
    });
  }
};

export const updateTrackData = (
  map: MapboxMap,
  trackPoints: Array<{
    longitude: number;
    latitude: number;
    pm25: number;
    timestamp: Date;
  }>,
  isRecording: boolean
) => {
  if (!map.getSource('track-points')) return;

  // Create features for track points
  const features = trackPoints.map((point, index) => ({
    type: 'Feature' as const,
    id: index,
    geometry: {
      type: 'Point' as const,
      coordinates: [point.longitude, point.latitude],
    },
    properties: {
      pm25: point.pm25,
      timestamp: point.timestamp.toISOString(),
    },
  }));

  // Update track points
  (map.getSource('track-points') as any).setData({
    type: 'FeatureCollection',
    features,
  });

  // Update track line
  if (trackPoints.length > 1) {
    const coordinates = trackPoints.map((point) => [
      point.longitude,
      point.latitude,
    ]);
    (map.getSource('track-line') as any).setData({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates,
      },
    });
  }

  // Auto-fit map to show entire track when not recording
  if (!isRecording && trackPoints.length > 0) {
    const coordinates = trackPoints.map((point) => [
      point.longitude,
      point.latitude,
    ]);
    // Create bounds dynamically through map instance
    const bounds = (map as any)._createBounds ? (map as any)._createBounds() : null;

    if (coordinates.length === 1) {
      // For single point, center on it with a reasonable zoom
      map.setCenter(coordinates[0] as [number, number]);
      map.setZoom(15);
    } else {
      // For multiple points, fit bounds
      if (bounds) {
        coordinates.forEach((coord) => {
          bounds.extend(coord as [number, number]);
        });

        map.fitBounds(bounds, {
          padding: 50,
          duration: 1000,
        });
      }
    }
  }
};

export const updateLayerStyles = (map: MapboxMap, thresholds: any) => {
  if (!map.getLayer('track-points')) return;

  // Update the circle color expression with new thresholds
  map.setPaintProperty(
    'track-points',
    'circle-color',
    createMapStyleExpression(thresholds)
  );
  
  // Ensure stroke properties remain disabled
  map.setPaintProperty('track-points', 'circle-stroke-width', 0);
  map.setPaintProperty('track-points', 'circle-stroke-color', 'transparent');
};
