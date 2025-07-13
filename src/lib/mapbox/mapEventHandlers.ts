import mapboxgl from 'mapbox-gl';

export const addTrackPointEventListeners = (map: mapboxgl.Map) => {
  // Add hover effects for track points
  map.on('mouseenter', 'track-points', (e) => {
    map.getCanvas().style.cursor = 'pointer';
    
    if (e.features && e.features[0]) {
      const feature = e.features[0];
      map.setFeatureState(
        { source: 'track-points', id: feature.id },
        { hovered: true }
      );

      // Show popup with PM data
      const properties = feature.properties;
      if (properties) {
        const popup = new mapboxgl.Popup({
          offset: 25,
          closeButton: false
        })
          .setLngLat(e.lngLat)
          .setHTML(`
            <div style="font-family: system-ui; padding: 6px; font-size: 12px;">
              <div style="font-weight: bold; margin-bottom: 4px;">PM2.5: ${Math.round(properties.pm25)} µg/m³</div>
              <div style="color: #666; font-size: 10px;">${new Date(properties.timestamp).toLocaleTimeString()}</div>
            </div>
          `)
          .addTo(map);
        
        // Store popup reference for cleanup
        (e.target as any)._tempPopup = popup;
      }
    }
  });

  map.on('mouseleave', 'track-points', (e) => {
    map.getCanvas().style.cursor = '';
    
    if (e.features && e.features[0]) {
      map.setFeatureState(
        { source: 'track-points', id: e.features[0].id },
        { hovered: false }
      );
    }

    // Remove temporary popup
    if ((e.target as any)._tempPopup) {
      (e.target as any)._tempPopup.remove();
      delete (e.target as any)._tempPopup;
    }
  });
};

export const reAddEventListeners = (map: mapboxgl.Map) => {
  // Re-add event listeners after style change
  map.on('mouseenter', 'track-points', (e) => {
    map.getCanvas().style.cursor = 'pointer';
    
    if (e.features && e.features[0]) {
      const feature = e.features[0];
      map.setFeatureState(
        { source: 'track-points', id: feature.id },
        { hovered: true }
      );

      const properties = feature.properties;
      if (properties) {
        const popup = new mapboxgl.Popup({
          offset: 25,
          closeButton: false
        })
          .setLngLat(e.lngLat)
          .setHTML(`
            <div style="font-family: system-ui; padding: 6px; font-size: 12px;">
              <div style="font-weight: bold; margin-bottom: 4px;">PM2.5: ${Math.round(properties.pm25)} µg/m³</div>
              <div style="color: #666; font-size: 10px;">${new Date(properties.timestamp).toLocaleTimeString()}</div>
            </div>
          `)
          .addTo(map);
        
        (e.target as any)._tempPopup = popup;
      }
    }
  });

  map.on('mouseleave', 'track-points', (e) => {
    map.getCanvas().style.cursor = '';
    
    if (e.features && e.features[0]) {
      map.setFeatureState(
        { source: 'track-points', id: e.features[0].id },
        { hovered: false }
      );
    }

    if ((e.target as any)._tempPopup) {
      (e.target as any)._tempPopup.remove();
      delete (e.target as any)._tempPopup;
    }
  });
};
