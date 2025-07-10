import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useGroupSettings } from '@/hooks/useGroupSettings';

export interface AlertSettings {
  pm1: {
    enabled: boolean;
    threshold: number | null;
    duration: number; // in minutes
  };
  pm25: {
    enabled: boolean;
    threshold: number | null;
    duration: number; // in minutes
  };
  pm10: {
    enabled: boolean;
    threshold: number | null;
    duration: number; // in minutes
  };
}

export interface ExposureState {
  pm1: {
    isAboveThreshold: boolean;
    startTime: Date | null;
    currentDuration: number; // in minutes
  };
  pm25: {
    isAboveThreshold: boolean;
    startTime: Date | null;
    currentDuration: number; // in minutes
  };
  pm10: {
    isAboveThreshold: boolean;
    startTime: Date | null;
    currentDuration: number; // in minutes
  };
}

// Default alert settings
const DEFAULT_ALERTS: AlertSettings = {
  pm1: {
    enabled: false,
    threshold: null,
    duration: 30
  },
  pm25: {
    enabled: false,
    threshold: null,
    duration: 30
  },
  pm10: {
    enabled: false,
    threshold: null,
    duration: 30
  }
};

interface AlertContextType {
  alertSettings: AlertSettings;
  updateAlertSettings: (newSettings: AlertSettings) => void;
  resetToDefaults: () => void;
  globalAlertsEnabled: boolean;
  setGlobalAlertsEnabled: (enabled: boolean) => void;
  checkAlerts: (pm1: number, pm25: number, pm10: number) => void;
  getExposureState: () => ExposureState;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

interface AlertProviderProps {
  children: ReactNode;
}

export function AlertProvider({ children }: AlertProviderProps) {
  const [alertSettings, setAlertSettings] = useState<AlertSettings>(DEFAULT_ALERTS);
  const [globalAlertsEnabled, setGlobalAlertsEnabled] = useState(true);
  const [exposureState, setExposureState] = useState<ExposureState>({
    pm1: { isAboveThreshold: false, startTime: null, currentDuration: 0 },
    pm25: { isAboveThreshold: false, startTime: null, currentDuration: 0 },
    pm10: { isAboveThreshold: false, startTime: null, currentDuration: 0 }
  });

  const { getCurrentAlarms, getCurrentSettings, isGroupMode } = useGroupSettings();

  // Get effective alert settings (group or user)
  const getEffectiveAlertSettings = (): AlertSettings => {
    if (isGroupMode) {
      const groupAlarms = getCurrentAlarms();
      const groupSettings = getCurrentSettings();
      
      if (groupAlarms.length > 0 && groupSettings) {
        // Convert group alarms to AlertSettings format
        const groupAlertSettings: AlertSettings = {
          pm1: {
            enabled: groupSettings.alarm_enabled && groupAlarms.some(a => a.enabled && a.pm1_threshold !== undefined),
            threshold: groupAlarms.find(a => a.enabled && a.pm1_threshold !== undefined)?.pm1_threshold || null,
            duration: 30 // Default duration, could be configurable
          },
          pm25: {
            enabled: groupSettings.alarm_enabled && groupAlarms.some(a => a.enabled && a.pm25_threshold !== undefined),
            threshold: groupAlarms.find(a => a.enabled && a.pm25_threshold !== undefined)?.pm25_threshold || null,
            duration: 30
          },
          pm10: {
            enabled: groupSettings.alarm_enabled && groupAlarms.some(a => a.enabled && a.pm10_threshold !== undefined),
            threshold: groupAlarms.find(a => a.enabled && a.pm10_threshold !== undefined)?.pm10_threshold || null,
            duration: 30
          }
        };
        return groupAlertSettings;
      }
    }
    
    // Return user settings if not in group mode or no group alarms
    return alertSettings;
  };

  // Load alert settings from localStorage on mount and request notification permissions
  useEffect(() => {
    const savedSettings = localStorage.getItem('alertSettings');
    const savedGlobalEnabled = localStorage.getItem('globalAlertsEnabled');
    
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setAlertSettings(parsedSettings);
      } catch (error) {
        console.error('Failed to parse saved alert settings:', error);
      }
    }

    if (savedGlobalEnabled !== null) {
      setGlobalAlertsEnabled(savedGlobalEnabled === 'true');
    }

    // Request notification permission if not already granted
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission);
      });
    }
  }, []);

  // Save alert settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('alertSettings', JSON.stringify(alertSettings));
  }, [alertSettings]);

  useEffect(() => {
    localStorage.setItem('globalAlertsEnabled', globalAlertsEnabled.toString());
  }, [globalAlertsEnabled]);

  const updateAlertSettings = (newSettings: AlertSettings) => {
    setAlertSettings(newSettings);
  };

  const resetToDefaults = () => {
    setAlertSettings(DEFAULT_ALERTS);
  };

  const triggerAlert = (pollutant: 'pm1' | 'pm25' | 'pm10', value: number, duration: number) => {
    // Use Web Notification API if available and permitted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`PM${pollutant === 'pm25' ? '2.5' : pollutant.toUpperCase()} Alert`, {
        body: `Pollution level ${value} μg/m³ detected for ${duration} minutes`,
        icon: '/favicon.ico'
      });
    }
    
    // Log the alert (you could also dispatch custom events here)
    console.warn(`🚨 Alert triggered: ${pollutant.toUpperCase()} at ${value} μg/m³ for ${duration} minutes`);
  };

  const checkAlerts = (pm1: number, pm25: number, pm10: number) => {
    if (!globalAlertsEnabled) return;

    const effectiveSettings = getEffectiveAlertSettings();
    const now = new Date();
    const pollutants = [
      { key: 'pm1' as const, value: pm1 },
      { key: 'pm25' as const, value: pm25 },
      { key: 'pm10' as const, value: pm10 }
    ];

    setExposureState(prevState => {
      const newState = { ...prevState };

      pollutants.forEach(({ key, value }) => {
        const settings = effectiveSettings[key];
        const currentState = newState[key];

        if (!settings.enabled || settings.threshold === null) {
          // Reset state if alert is disabled
          newState[key] = { isAboveThreshold: false, startTime: null, currentDuration: 0 };
          return;
        }

        const isAbove = value > settings.threshold;

        if (isAbove && !currentState.isAboveThreshold) {
          // Start tracking exposure
          newState[key] = {
            isAboveThreshold: true,
            startTime: now,
            currentDuration: 0
          };
        } else if (isAbove && currentState.isAboveThreshold && currentState.startTime) {
          // Update duration
          const durationMinutes = Math.floor((now.getTime() - currentState.startTime.getTime()) / (1000 * 60));
          newState[key] = {
            ...currentState,
            currentDuration: durationMinutes
          };

          // Check if alert should be triggered
          if (durationMinutes >= settings.duration && durationMinutes % settings.duration === 0) {
            triggerAlert(key, value, durationMinutes);
          }
        } else if (!isAbove) {
          // Reset state when below threshold
          newState[key] = { isAboveThreshold: false, startTime: null, currentDuration: 0 };
        }
      });

      return newState;
    });
  };

  const getExposureState = () => exposureState;

  return (
    <AlertContext.Provider value={{
      alertSettings: getEffectiveAlertSettings(),
      updateAlertSettings,
      resetToDefaults,
      globalAlertsEnabled,
      setGlobalAlertsEnabled,
      checkAlerts,
      getExposureState
    }}>
      {children}
    </AlertContext.Provider>
  );
}

export function useAlerts() {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error('useAlerts must be used within an AlertProvider');
  }
  return context;
}