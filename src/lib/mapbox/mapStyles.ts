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

// Function to create map styling expressions based on current thresholds
export const createMapStyleExpression = (thresholds: any): any => {
  return [
    'case',
    ['<=', ['get', 'pm25'], thresholds.pm25.good],
    '#22c55e', // Good - Green
    ['<=', ['get', 'pm25'], thresholds.pm25.moderate],
    '#eab308', // Moderate - Yellow
    ['<=', ['get', 'pm25'], thresholds.pm25.poor],
    '#f97316', // Poor - Orange
    '#ef4444', // Very Poor - Red
  ] as any;
};

export const MAP_STYLES = {
  LIGHT: 'mapbox://styles/mapbox/light-v11',
  SATELLITE: 'mapbox://styles/mapbox/satellite-streets-v12',
} as const;
