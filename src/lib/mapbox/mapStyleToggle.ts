import { MAP_STYLES, createMapStyleExpression } from './mapStyles';
import { reAddEventListeners } from './mapEventHandlers';

// Dynamic import types for better tree shaking
type MapboxMap = any;

export const toggleMapStyle = (
  map: MapboxMap,
  isSatellite: boolean,
  trackPoints: Array<{
    longitude: number;
    latitude: number;
    pm25: number;
    timestamp: number;
  }>,
  thresholds: any,
  onStyleChange: (newIsSatellite: boolean) => void
) => {
  const newStyle = isSatellite ? MAP_STYLES.LIGHT : MAP_STYLES.SATELLITE;

  map.setStyle(newStyle);
  onStyleChange(!isSatellite);

  // Re-add layers after style change
  map.once('styledata', () => {
    // Re-add track data sources and layers
    map.addSource('track-line', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates:
            trackPoints.length > 1
              ? trackPoints.map((point) => [point.longitude, point.latitude])
              : [],
        },
      },
    });

    map.addSource('track-points', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: trackPoints.map((point, index) => ({
          type: 'Feature' as const,
          id: index,
          geometry: {
            type: 'Point' as const,
            coordinates: [point.longitude, point.latitude],
          },
          properties: {
            pm25: point.pm25,
            timestamp: point.timestamp, // Use epoch ms for map data
          },
        })),
      },
    });

    // Re-add layers
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
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 0.8,
      },
    });

    // Re-add event listeners
    reAddEventListeners(map);
  });
};
