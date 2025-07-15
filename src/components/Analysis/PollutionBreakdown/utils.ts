export const getColorForKey = (key: string): string => {
  const colors = [
    '#10b981', // green
    '#3b82f6', // blue
    '#f59e0b', // yellow
    '#f97316', // orange
    '#ef4444', // red
    '#8b5cf6', // purple
    '#ec4899', // pink
  ];

  const hash = key.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

export const getWHOStatus = (avgPM: number, pmType: string): string => {
  if (pmType === 'pm25') {
    return avgPM > 15
      ? 'bg-red-500'
      : avgPM > 12
        ? 'bg-orange-500'
        : 'bg-green-500';
  } else if (pmType === 'pm10') {
    return avgPM > 45
      ? 'bg-red-500'
      : avgPM > 20
        ? 'bg-orange-500'
        : 'bg-green-500';
  }
  return 'bg-gray-400'; // PM1 has no WHO threshold
};

export const getWHOThreshold = (
  pmType: string,
  selectedPeriod: string,
  t: (key: string, options?: any) => string
): { value: number | null; label: string } => {
  if (pmType === 'pm1') {
    return { value: null, label: t('analysis.noWHOThreshold') };
  }

  // Daily/weekly vs monthly/yearly thresholds
  const isShortPeriod = selectedPeriod === 'day' || selectedPeriod === 'week';

  if (pmType === 'pm25') {
    return isShortPeriod
      ? { value: 15, label: t('analysis.whoThresholdDaily', { value: 15 }) }
      : { value: 5, label: t('analysis.whoThresholdAnnual', { value: 5 }) };
  } else if (pmType === 'pm10') {
    return isShortPeriod
      ? { value: 45, label: t('analysis.whoThresholdDaily', { value: 45 }) }
      : { value: 15, label: t('analysis.whoThresholdAnnual', { value: 15 }) };
  }

  return { value: null, label: '' };
};
