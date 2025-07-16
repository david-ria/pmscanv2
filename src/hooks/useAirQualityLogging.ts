import { useState, useEffect } from 'react';
import * as logger from '@/utils/logger';

const AIR_QUALITY_LOGGING_KEY = 'air-quality-logging-enabled';

export function useAirQualityLogging() {
  const [isEnabled, setIsEnabled] = useState(() => {
    try {
      const stored = localStorage.getItem(AIR_QUALITY_LOGGING_KEY);
      return stored ? JSON.parse(stored) : true; // Default to enabled
    } catch (error) {
      logger.error('Error reading air quality logging preference:', error);
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(AIR_QUALITY_LOGGING_KEY, JSON.stringify(isEnabled));
      logger.debug(`Air quality logging ${isEnabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      logger.error('Error saving air quality logging preference:', error);
    }
  }, [isEnabled]);

  const setEnabled = (enabled: boolean) => {
    setIsEnabled(enabled);
  };

  const toggleEnabled = () => {
    setIsEnabled(!isEnabled);
  };

  return {
    isEnabled,
    setEnabled,
    toggleEnabled,
  };
}