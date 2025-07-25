import { LocationData } from '@/types/PMScan';
import { getQualityColor } from './mapStyles';

// Dynamic import types for better tree shaking
type MapboxMap = any;

interface PMData {
  pm1: number;
  pm25: number;
  pm10: number;
  timestamp: Date;
}

export const createLocationMarker = (
  map: MapboxMap,
  currentLocation: LocationData,
  pmData: PMData | null,
  getAirQualityLevel: (
    value: number,
    type: string
  ) => { level: string; color: string },
  existingMarker?: any | null
): any => {
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
          ${pmData.timestamp.toLocaleTimeString()}
        </div>
      </div>`;
  }

  popupContent += '</div>';

  // Create marker using dynamic Mapbox instance
  let marker = null;
  if ((map as any)._createMarker && (map as any)._createPopup) {
    // Get color based on PM2.5 quality if data is available
    const markerColor = pmData 
      ? getQualityColor(pmData.pm25, getAirQualityLevel)
      : '#6b7280'; // Gray for no data
      
    marker = (map as any)._createMarker({
      color: markerColor,
      scale: 0.8,
    })
      .setLngLat([longitude, latitude])
      .setPopup((map as any)._createPopup({ offset: 25 }).setHTML(popupContent))
      .addTo(map);
  }

  // Center map on new location
  map.flyTo({
    center: [longitude, latitude],
    zoom: 15,
    duration: 1500,
  });

  return marker;
};
