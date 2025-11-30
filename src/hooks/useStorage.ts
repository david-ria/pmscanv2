import { useState, useEffect, useCallback } from 'react';
import { storageService, STORAGE_KEYS } from '@/services/storageService';

export function useStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(() => {
    return storageService.get<T>(key) ?? defaultValue;
  });

  const updateValue = useCallback((newValue: T | ((prev: T) => T)) => {
    const updatedValue = typeof newValue === 'function' ? (newValue as (prev: T) => T)(value) : newValue;
    setValue(updatedValue);
    storageService.set(key, updatedValue);
  }, [key, value]);

  const removeValue = useCallback(() => {
    setValue(defaultValue);
    storageService.remove(key);
  }, [key, defaultValue]);

  return [value, updateValue, removeValue] as const;
}

export function useStorageSettings<T extends Record<string, any>>(
  key: string, 
  defaultSettings: T
) {
  const [settings, setSettings] = useState<T>(() => {
    return storageService.getSettings(key, defaultSettings);
  });

  const updateSettings = useCallback((updates: Partial<T>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    storageService.setSettings(key, newSettings);
  }, [key, settings]);

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
    storageService.setSettings(key, defaultSettings);
  }, [key, defaultSettings]);

  return {
    settings,
    updateSettings,
    resetSettings,
  };
}

export function useStorageBoolean(key: string, defaultValue: boolean = false) {
  const [value, setValue] = useState<boolean>(() => {
    return storageService.getBoolean(key, defaultValue);
  });

  const updateValue = useCallback((newValue: boolean | ((prev: boolean) => boolean)) => {
    const updatedValue = typeof newValue === 'function' ? newValue(value) : newValue;
    setValue(updatedValue);
    storageService.setBoolean(key, updatedValue);
  }, [key, value]);

  const toggle = useCallback(() => {
    const newValue = storageService.toggleBoolean(key, defaultValue);
    setValue(newValue);
    return newValue;
  }, [key, defaultValue]);

  return [value, updateValue, toggle] as const;
}

export function useStorageArray<T>(key: string) {
  const [array, setArray] = useState<T[]>(() => {
    return storageService.getArray<T>(key);
  });

  const updateArray = useCallback((newArray: T[]) => {
    setArray(newArray);
    storageService.setArray(key, newArray);
  }, [key]);

  const push = useCallback((item: T) => {
    const newArray = [...array, item];
    setArray(newArray);
    storageService.setArray(key, newArray);
  }, [key, array]);

  const remove = useCallback((predicate: (item: T) => boolean) => {
    const newArray = array.filter(item => !predicate(item));
    setArray(newArray);
    storageService.setArray(key, newArray);
  }, [key, array]);

  const clear = useCallback(() => {
    setArray([]);
    storageService.setArray(key, []);
  }, [key]);

  return {
    array,
    updateArray,
    push,
    remove,
    clear,
  };
}

// Convenience hooks for common storage patterns
export const useAutoContextSettings = () => {
  return useStorageSettings(STORAGE_KEYS.AUTO_CONTEXT_SETTINGS, {
    enabled: false,
    mlEnabled: false,
    highAccuracy: false,
    overrideContext: false,
  });
};

export const useAlertSettings = () => {
  return useStorageSettings(STORAGE_KEYS.ALERT_SETTINGS, {});
};

export const useGlobalAlertsEnabled = () => {
  return useStorageBoolean(STORAGE_KEYS.GLOBAL_ALERTS_ENABLED, true);
};

export const useThresholdSettings = () => {
  return useStorageSettings(STORAGE_KEYS.AIR_QUALITY_THRESHOLDS, {
    pm1: { good: 12, moderate: 35, poor: 55, veryPoor: 110 },
    pm25: { good: 12, moderate: 35, poor: 55, veryPoor: 110 },
    pm10: { good: 20, moderate: 50, poor: 90, veryPoor: 180 },
  });
};

export const useWeatherLogging = () => {
  return useStorageBoolean(STORAGE_KEYS.WEATHER_LOGGING, true);
};

export const useGeohashSettings = () => {
  return useStorageSettings(STORAGE_KEYS.GEOHASH_SETTINGS, {
    enabled: true,
    precision: 8, // Building level by default
  });
};