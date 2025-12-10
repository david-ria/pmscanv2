export type PollutantType = 'pm1' | 'pm25' | 'pm10' | 'tvoc';

// Thresholds for different pollutants
export const POLLUTANT_THRESHOLDS: Record<PollutantType, { good: number; moderate: number; poor: number }> = {
  pm1: { good: 5, moderate: 10, poor: 15 },
  pm25: { good: 10, moderate: 15, poor: 25 },
  pm10: { good: 20, moderate: 35, poor: 50 },
  tvoc: { good: 100, moderate: 250, poor: 500 },
};

// Helper function to get color for PM2.5 values
export const getQualityColor = (
  pm25: number,
  getAirQualityLevel: (
    value: number,
    type: string
  ) => { level: string; color: string }
): string => {
  const quality = getAirQualityLevel(pm25, 'pm25');
  switch (quality.level) {
    case 'good':
      return '#22c55e';
    case 'moderate':
      return '#eab308';
    case 'poor':
      return '#f97316';
    case 'very-poor':
      return '#ef4444';
    default:
      return '#6b7280';
  }
};

// Function to create map styling expressions based on pollutant type
export const createMapStyleExpression = (thresholds: any, pollutantType: PollutantType = 'pm25'): any => {
  const propertyName = 'pollutantValue';
  const pollutantThresholds = POLLUTANT_THRESHOLDS[pollutantType];
  
  return [
    'case',
    ['<=', ['get', propertyName], pollutantThresholds.good],
    '#22c55e', // Good - Green
    ['<=', ['get', propertyName], pollutantThresholds.moderate],
    '#eab308', // Moderate - Yellow
    ['<=', ['get', propertyName], pollutantThresholds.poor],
    '#f97316', // Poor - Orange
    '#ef4444', // Very Poor - Red
  ] as mapboxgl.Expression;
};

export const MAP_STYLES = {
  LIGHT: 'mapbox://styles/mapbox/light-v11',
  SATELLITE: 'mapbox://styles/mapbox/satellite-streets-v12',
} as const;
