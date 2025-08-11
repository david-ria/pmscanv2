import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { useGroupSettings } from '@/hooks/useGroupSettings';
import * as logger from '@/utils/logger';
import { getMigratedItem, setMigratedItem } from '@/lib/storageMigration';

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
    duration: 30,
  },
  pm25: {
    enabled: false,
    threshold: null,
    duration: 30,
  },
  pm10: {
    enabled: false,
    threshold: null,
    duration: 30,
  },
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
  const [alertSettings, setAlertSettings] =
    useState<AlertSettings>(DEFAULT_ALERTS);
  const [globalAlertsEnabled, setGlobalAlertsEnabled] = useState(true);
  const [exposureState, setExposureState] = useState<ExposureState>({
    pm1: { isAboveThreshold: false, startTime: null, currentDuration: 0 },
    pm25: { isAboveThreshold: false, startTime: null, currentDuration: 0 },
    pm10: { isAboveThreshold: false, startTime: null, currentDuration: 0 },
  });

  const { getCurrentAlarms, getCurrentSettings, isGroupMode } =
    useGroupSettings();

  // Get effective alert settings (group or user)
  const getEffectiveAlertSettings = (): AlertSettings => {
    if (isGroupMode) {
      const groupAlarms = getCurrentAlarms();
      const groupSettings = getCurrentSettings();

      if (groupAlarms.length > 0 && groupSettings) {
        // Convert group alarms to AlertSettings format
        const groupAlertSettings: AlertSettings = {
          pm1: {
            enabled:
              groupSettings.alarm_enabled &&
              groupAlarms.some(
                (a) => a.enabled && a.pm1_threshold !== undefined
              ),
            threshold:
              groupAlarms.find(
                (a) => a.enabled && a.pm1_threshold !== undefined
              )?.pm1_threshold || null,
            duration: 30, // Default duration, could be configurable
          },
          pm25: {
            enabled:
              groupSettings.alarm_enabled &&
              groupAlarms.some(
                (a) => a.enabled && a.pm25_threshold !== undefined
              ),
            threshold:
              groupAlarms.find(
                (a) => a.enabled && a.pm25_threshold !== undefined
              )?.pm25_threshold || null,
            duration: 30,
          },
          pm10: {
            enabled:
              groupSettings.alarm_enabled &&
              groupAlarms.some(
                (a) => a.enabled && a.pm10_threshold !== undefined
              ),
            threshold:
              groupAlarms.find(
                (a) => a.enabled && a.pm10_threshold !== undefined
              )?.pm10_threshold || null,
            duration: 30,
          },
        };
        return groupAlertSettings;
      }
    }

    // Return user settings if not in group mode or no group alarms
    return alertSettings;
  };

  // Load alert settings from versioned storage on mount and request notification permissions
  useEffect(() => {
    try {
      const savedSettings = getMigratedItem('alertSettings', null);
      const savedGlobalEnabled = getMigratedItem('globalAlertsEnabled', true);

      if (savedSettings && Object.keys(savedSettings).length > 0) {
        // Validate that saved settings have the correct structure
        const validatedSettings: AlertSettings = {
          pm1: {
            enabled: Boolean(savedSettings.pm1?.enabled),
            threshold: typeof savedSettings.pm1?.threshold === 'number' ? savedSettings.pm1.threshold : null,
            duration: typeof savedSettings.pm1?.duration === 'number' ? savedSettings.pm1.duration : 30,
          },
          pm25: {
            enabled: Boolean(savedSettings.pm25?.enabled),
            threshold: typeof savedSettings.pm25?.threshold === 'number' ? savedSettings.pm25.threshold : null,
            duration: typeof savedSettings.pm25?.duration === 'number' ? savedSettings.pm25.duration : 30,
          },
          pm10: {
            enabled: Boolean(savedSettings.pm10?.enabled),
            threshold: typeof savedSettings.pm10?.threshold === 'number' ? savedSettings.pm10.threshold : null,
            duration: typeof savedSettings.pm10?.duration === 'number' ? savedSettings.pm10.duration : 30,
          },
        };
        setAlertSettings(validatedSettings);
      }

      setGlobalAlertsEnabled(savedGlobalEnabled);

      // Request notification permission if not already granted
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then((permission) => {
          logger.debug('Notification permission:', permission);
        });
      }
    } catch (error) {
      logger.error('Failed to load alert settings from versioned storage:', error);
    }
  }, []);

  // Save alert settings to versioned storage whenever they change
  useEffect(() => {
    try {
      setMigratedItem('alertSettings', alertSettings);
    } catch (error) {
      logger.error('Failed to save alert settings to versioned storage:', error);
    }
  }, [alertSettings]);

  useEffect(() => {
    try {
      setMigratedItem('globalAlertsEnabled', globalAlertsEnabled);
    } catch (error) {
      logger.error('Failed to save global alerts enabled to versioned storage:', error);
    }
  }, [globalAlertsEnabled]);

  const updateAlertSettings = (newSettings: AlertSettings) => {
    // Validate settings before saving
    const validatedSettings: AlertSettings = {
      pm1: {
        enabled: Boolean(newSettings.pm1?.enabled),
        threshold: typeof newSettings.pm1?.threshold === 'number' ? newSettings.pm1.threshold : null,
        duration: typeof newSettings.pm1?.duration === 'number' ? newSettings.pm1.duration : 30,
      },
      pm25: {
        enabled: Boolean(newSettings.pm25?.enabled),
        threshold: typeof newSettings.pm25?.threshold === 'number' ? newSettings.pm25.threshold : null,
        duration: typeof newSettings.pm25?.duration === 'number' ? newSettings.pm25.duration : 30,
      },
      pm10: {
        enabled: Boolean(newSettings.pm10?.enabled),
        threshold: typeof newSettings.pm10?.threshold === 'number' ? newSettings.pm10.threshold : null,
        duration: typeof newSettings.pm10?.duration === 'number' ? newSettings.pm10.duration : 30,
      },
    };
    setAlertSettings(validatedSettings);
  };

  const resetToDefaults = () => {
    setAlertSettings(DEFAULT_ALERTS);
  };

  const triggerAlert = (
    pollutant: 'pm1' | 'pm25' | 'pm10',
    value: number,
    duration: number
  ) => {
    // Use Web Notification API if available and permitted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(
        `PM${pollutant === 'pm25' ? '2.5' : pollutant.toUpperCase()} Alert`,
        {
          body: `Pollution level ${value} μg/m³ detected for ${duration} minutes`,
          icon: '/favicon.ico',
        }
      );
    }

    // Log the alert (you could also dispatch custom events here)
    console.warn(
      `🚨 Alert triggered: ${pollutant.toUpperCase()} at ${value} μg/m³ for ${duration} minutes`
    );
  };

  const checkAlerts = (pm1: number, pm25: number, pm10: number) => {
    if (!globalAlertsEnabled) return;

    const effectiveSettings = getEffectiveAlertSettings();
    const now = new Date();
    const pollutants = [
      { key: 'pm1' as const, value: pm1 },
      { key: 'pm25' as const, value: pm25 },
      { key: 'pm10' as const, value: pm10 },
    ];

    setExposureState((prevState) => {
      const newState = { ...prevState };

      pollutants.forEach(({ key, value }) => {
        const settings = effectiveSettings[key];
        const currentState = newState[key];

        if (!settings.enabled || settings.threshold === null) {
          // Reset state if alert is disabled
          newState[key] = {
            isAboveThreshold: false,
            startTime: null,
            currentDuration: 0,
          };
          return;
        }

        const isAbove = value > settings.threshold;

        if (isAbove && !currentState.isAboveThreshold) {
          // Start tracking exposure
          newState[key] = {
            isAboveThreshold: true,
            startTime: now,
            currentDuration: 0,
          };
        } else if (
          isAbove &&
          currentState.isAboveThreshold &&
          currentState.startTime
        ) {
          // Update duration
          const durationMinutes = Math.floor(
            (now.getTime() - currentState.startTime.getTime()) / (1000 * 60)
          );
          newState[key] = {
            ...currentState,
            currentDuration: durationMinutes,
          };

          // Check if alert should be triggered
          if (
            durationMinutes >= settings.duration &&
            durationMinutes % settings.duration === 0
          ) {
            triggerAlert(key, value, durationMinutes);
          }
        } else if (!isAbove) {
          // Reset state when below threshold
          newState[key] = {
            isAboveThreshold: false,
            startTime: null,
            currentDuration: 0,
          };
        }
      });

      return newState;
    });
  };

  const getExposureState = () => exposureState;

  return (
    <AlertContext.Provider
      value={{
        alertSettings: getEffectiveAlertSettings(),
        updateAlertSettings,
        resetToDefaults,
        globalAlertsEnabled,
        setGlobalAlertsEnabled,
        checkAlerts,
        getExposureState,
      }}
    >
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
