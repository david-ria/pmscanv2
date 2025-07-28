import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';

export interface AirQualityThresholds {
  pm1: {
    good: number;
    moderate: number;
    poor: number;
  };
  pm25: {
    good: number;
    moderate: number;
    poor: number;
  };
  pm10: {
    good: number;
    moderate: number;
    poor: number;
  };
}

// WHO recommended thresholds (default values)
const WHO_THRESHOLDS: AirQualityThresholds = {
  pm1: {
    good: 10,
    moderate: 25,
    poor: 50,
  },
  pm25: {
    good: 12,
    moderate: 35,
    poor: 55,
  },
  pm10: {
    good: 20,
    moderate: 50,
    poor: 100,
  },
};

interface ThresholdContextType {
  thresholds: AirQualityThresholds;
  updateThresholds: (newThresholds: AirQualityThresholds) => void;
  resetToWHOStandards: () => void;
  getAirQualityLevel: (
    value: number,
    pollutant: 'pm1' | 'pm25' | 'pm10'
  ) => {
    level: 'good' | 'moderate' | 'poor' | 'very-poor';
    color: string;
  };
}

const ThresholdContext = createContext<ThresholdContextType | undefined>(
  undefined
);

interface ThresholdProviderProps {
  children: ReactNode;
}

export function ThresholdProvider({ children }: ThresholdProviderProps) {
  const [thresholds, setThresholds] =
    useState<AirQualityThresholds>(WHO_THRESHOLDS);

  // Load thresholds from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('airQualityThresholds');
    if (saved) {
      try {
        const parsedThresholds = JSON.parse(saved);
        setThresholds(parsedThresholds);
      } catch (error) {
        console.error('Failed to parse saved thresholds:', error);
        // Keep WHO standards as fallback
      }
    }
  }, []);

  // Save thresholds to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('airQualityThresholds', JSON.stringify(thresholds));
  }, [thresholds]);

  const updateThresholds = useCallback(
    (newThresholds: AirQualityThresholds) => {
      setThresholds(newThresholds);
    },
    []
  );

  const resetToWHOStandards = useCallback(() => {
    setThresholds(WHO_THRESHOLDS);
  }, []);

  const getAirQualityLevel = useCallback(
    (value: number, pollutant: 'pm1' | 'pm25' | 'pm10') => {
      const pollutantThresholds = thresholds[pollutant];

      if (value <= pollutantThresholds.good) {
        return { level: 'good' as const, color: 'air-good' };
      }
      if (value <= pollutantThresholds.moderate) {
        return { level: 'moderate' as const, color: 'air-moderate' };
      }
      if (value <= pollutantThresholds.poor) {
        return { level: 'poor' as const, color: 'air-poor' };
      }
      return { level: 'very-poor' as const, color: 'air-very-poor' };
    },
    [thresholds]
  );

  return (
    <ThresholdContext.Provider
      value={{
        thresholds,
        updateThresholds,
        resetToWHOStandards,
        getAirQualityLevel,
      }}
    >
      {children}
    </ThresholdContext.Provider>
  );
}

export function useThresholds() {
  const context = useContext(ThresholdContext);
  if (context === undefined) {
    throw new Error('useThresholds must be used within a ThresholdProvider');
  }
  return context;
}
