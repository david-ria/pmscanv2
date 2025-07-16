import { useState, useCallback } from 'react';

const WEATHER_LOGGING_KEY = 'weather_logging_enabled';

export function useWeatherLogging() {
  const [isEnabled, setIsEnabled] = useState(() => {
    const stored = localStorage.getItem(WEATHER_LOGGING_KEY);
    return stored ? JSON.parse(stored) : false;
  });

  const setEnabled = useCallback((enabled: boolean) => {
    setIsEnabled(enabled);
    localStorage.setItem(WEATHER_LOGGING_KEY, JSON.stringify(enabled));
  }, []);

  return {
    isEnabled,
    setEnabled,
  };
}