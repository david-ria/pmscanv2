import { LocationData } from '@/types/PMScan';
import { getQualityColor } from './mapStyles';

// Dynamic import types for better tree shaking
type MapboxMap = any;

interface PMData {
  pm1: number;
  pm25: number;
  pm10: number;
  timestamp: Date | number; // Support both Date and numeric timestamps
}

export const createLocationMarker = async (
  map: MapboxMap,
  currentLocation: LocationData,
  pmData: PMData | null,
  getAirQualityLevel: (
    value: number,
    type: string
  ) => { level: string; color: string },
  existingMarker?: any | null
): Promise<any> => {
  const { longitude, latitude } = currentLocation;

  // Remove existing marker
  if (existingMarker) {
    existingMarker.remove();
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
    const pm25Quality = getAirQualityLevel(pmData.pm25, 'pm25');
    const pm1Quality = getAirQualityLevel(pmData.pm1, 'pm1');
    const pm10Quality = getAirQualityLevel(pmData.pm10, 'pm10');

    popupContent += `
      <div style="border-top: 1px solid #e5e7eb; padding-top: 8px;">
        <div style="font-weight: bold; margin-bottom: 4px;">Air Quality</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; font-size: 11px;">
          <div style="text-align: center; color: ${getQualityColor(pmData.pm1, getAirQualityLevel)};">
            <div style="font-weight: bold;">${Math.round(pmData.pm1)}</div>
            <div>PM1</div>
          </div>
          <div style="text-align: center; color: ${getQualityColor(pmData.pm25, getAirQualityLevel)};">
            <div style="font-weight: bold;">${Math.round(pmData.pm25)}</div>
            <div>PM2.5</div>
          </div>
          <div style="text-align: center; color: ${getQualityColor(pmData.pm10, getAirQualityLevel)};">
            <div style="font-weight: bold;">${Math.round(pmData.pm10)}</div>
            <div>PM10</div>
          </div>
        </div>
        <div style="font-size: 10px; color: #666; margin-top: 4px; text-align: center;">
          ${typeof pmData.timestamp === 'number' ? new Date(pmData.timestamp).toLocaleTimeString() : pmData.timestamp.toLocaleTimeString()}
        </div>
      </div>`;
  }

  popupContent += '</div>';

  // Create marker using proper Mapbox GL JS API
  let marker = null;
  
  // Import Mapbox GL dynamically to get the Marker class
  const { loadMapboxGL } = await import('@/lib/dynamicImports');
  const mapboxgl = await loadMapboxGL();
  
  // Get color based on PM2.5 quality if data is available
  const markerColor = pmData 
    ? getQualityColor(pmData.pm25, getAirQualityLevel)
    : '#6b7280'; // Gray for no data
    
  // Create a custom marker element
  const markerElement = document.createElement('div');
  markerElement.className = 'mapbox-marker';
  markerElement.style.backgroundColor = markerColor;
  markerElement.style.width = '20px';
  markerElement.style.height = '20px';
  markerElement.style.borderRadius = '50%';
  markerElement.style.border = '3px solid white';
  markerElement.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
  markerElement.style.cursor = 'pointer';
  
  // Create popup
  const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(popupContent);
  
  // Create marker with custom element
  marker = new mapboxgl.Marker(markerElement)
    .setLngLat([longitude, latitude])
    .setPopup(popup)
    .addTo(map);

  // Center map on new location
  map.flyTo({
    center: [longitude, latitude],
    zoom: 15,
    duration: 1500,
  });

  return marker;
};
