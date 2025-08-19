import { useState, useCallback } from 'react';
import { useSubscription } from '@/hooks/useSubscription';

const WEATHER_LOGGING_KEY = 'weather_logging_enabled';

export function useWeatherLogging() {
  const { features } = useSubscription();
  const [isEnabled, setIsEnabled] = useState(() => {
    const stored = localStorage.getItem(WEATHER_LOGGING_KEY);
    return stored ? JSON.parse(stored) : false;
  });

  const setEnabled = useCallback((enabled: boolean) => {
    // Only allow enabling if user has premium access
    if (enabled && !features.canUseWeatherData) {
      return;
    }
    setIsEnabled(enabled);
    localStorage.setItem(WEATHER_LOGGING_KEY, JSON.stringify(enabled));
  }, [features.canUseWeatherData]);

  return {
    isEnabled: isEnabled && features.canUseWeatherData,
    setEnabled,
  };
}