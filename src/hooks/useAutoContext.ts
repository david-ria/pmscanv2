import { useState, useEffect, useCallback, useMemo } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as logger from '@/utils/logger';
import { PMScanData } from '@/lib/pmscan/types';
import { LocationData } from '@/types/PMScan';
import { useGPS } from '@/hooks/useGPS';
import { useWeatherService } from '@/hooks/useWeatherService';
import { MODEL_LABELS } from '@/lib/recordingConstants';
import { supabase } from '@/integrations/supabase/client';
import { useStorageSettings } from '@/hooks/useStorage';
import { STORAGE_KEYS } from '@/services/storageService';
import {
  DEFAULT_AUTO_CONTEXT_RULES,
  AutoContextRule,
  AutoContextEvaluationData,
  evaluateAutoContextRules,
  AutoContextConfig,
} from '@/lib/autoContextConfig';

interface AutoContextInputs {
  pmData?: PMScanData;
  location?: LocationData;
  speed?: number;
  isMoving?: boolean;
}

interface AutoContextSettings {
  enabled: boolean;
  mlEnabled?: boolean;
  highAccuracy?: boolean;
  overrideContext?: boolean;
  homeArea?: {
    latitude: number;
    longitude: number;
    radius: number; // in meters
  };
  workArea?: {
    latitude: number;
    longitude: number;
    radius: number; // in meters
  };
  homeWifiSSID?: string;
  workWifiSSID?: string;
  customRules?: AutoContextRule[]; // Allow custom rules
}

const DEFAULT_SETTINGS: AutoContextSettings = {
  enabled: false,
  mlEnabled: false,
  highAccuracy: false,
  overrideContext: false,
};

export function useAutoContext() {
  const { settings, updateSettings } = useStorageSettings(
    STORAGE_KEYS.AUTO_CONTEXT_SETTINGS,
    DEFAULT_SETTINGS
  );

  const [previousWifiSSID, setPreviousWifiSSID] = useState<string>('');
  const [currentWifiSSID, setCurrentWifiSSID] = useState<string>('');
  const [latestContext, setLatestContext] = useState<string>('');
  const [model, setModel] = useState<tf.LayersModel | null>(null);
  const homeCountsKey = 'homeWifiCounts';
  const workCountsKey = 'workWifiCounts';
  const { locationEnabled, latestLocation, requestLocationPermission } = useGPS(
    settings.enabled,
    settings.highAccuracy ?? false
  );
  
  const { weatherData } = useWeatherService();

  const toggleEnabled = useCallback(() => {
    updateSettings({ enabled: !settings.enabled });
  }, [settings.enabled, updateSettings]);

  // Save settings to localStorage whenever they change - handled by useStorageSettings

  // Load WiFi SSIDs from user profile
  useEffect(() => {
    const loadSSIDs = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('profiles')
          .select('home_wifi_ssid, work_wifi_ssid')
          .eq('id', user.id)
          .single();

        if (!error && data) {
          updateSettings({
            homeWifiSSID: data.home_wifi_ssid || settings.homeWifiSSID,
            workWifiSSID: data.work_wifi_ssid || settings.workWifiSSID,
          });
        }
      } catch (err) {
        console.error('Failed to load profile SSIDs', err);
      }
    };

    loadSSIDs();
  }, []);

  useEffect(() => {
    if (settings.mlEnabled && !model) {
      tf.loadLayersModel('/model/model.json')
        .then(setModel)
        .catch((err) => {
          console.error('Failed to load ML model', err);
          setModel(null);
        });
    }
  }, [settings.mlEnabled, model]);

  useEffect(() => {
    if (settings.enabled) {
      requestLocationPermission().catch((err) => {
        console.error('Failed to request location permission', err);
      });
    }
  }, [settings.enabled, requestLocationPermission]);

  // Real WiFi detection function
  const getCurrentWifiSSID = useCallback((): string => {
    // For now, we'll simulate WiFi connection when online
    // In a real app, this would use Capacitor's Network plugin to get actual SSID
    const isOnWifi = navigator.onLine;
    console.log('WiFi detection - isOnline:', navigator.onLine, 'simulating WiFi:', isOnWifi);
    return isOnWifi ? 'GenericWiFi' : '';
  }, []);

  // Check if connected to car bluetooth
  const isConnectedToCarBluetooth = useCallback(async (): Promise<boolean> => {
    try {
      // Check if Web Bluetooth API is available (limited browser support)
      if (!('bluetooth' in navigator)) {
        return false;
      }

      // For now, return false as Web Bluetooth getDevices() is not widely supported
      // In a real mobile app, this would use native Bluetooth APIs
      return false;
    } catch (error) {
      // Bluetooth not available or permission denied
      return false;
    }
  }, []);

  // Real cellular signal detection
  const getCellularSignal = useCallback((): boolean => {
    // In a real implementation, this would use device APIs
    // For now, detect if online but not connected to WiFi
    return navigator.onLine && !getCurrentWifiSSID();
  }, [getCurrentWifiSSID]);

  // Check if a location is within an area
  const isInsideArea = useCallback(
    (
      currentLat: number,
      currentLng: number,
      areaLat: number,
      areaLng: number,
      radiusMeters: number
    ): boolean => {
      const R = 6371000; // Earth's radius in meters
      const dLat = ((areaLat - currentLat) * Math.PI) / 180;
      const dLng = ((areaLng - currentLng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((currentLat * Math.PI) / 180) *
          Math.cos((areaLat * Math.PI) / 180) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;
      return distance <= radiusMeters;
    },
    []
  );

  const convertToTensor = useCallback(
    (inputs: AutoContextInputs): tf.Tensor => {
      const { location, speed = 0, isMoving = false } = inputs;
      const wifiId =
        currentWifiSSID === settings.homeWifiSSID
          ? 1
          : currentWifiSSID === settings.workWifiSSID
            ? 2
            : 0;
      const data = [location?.accuracy ?? 0, speed, isMoving ? 1 : 0, wifiId];
      return tf.tensor2d([data]);
    },
    [currentWifiSSID, settings.homeWifiSSID, settings.workWifiSSID]
  );

  // Track WiFi usage by time periods for automatic home/work detection
  const trackWifiByTime = useCallback((ssid: string) => {
    if (!ssid) return {};

    const currentHour = new Date().getHours();
    const timeKey = 'wifiTimeTracking';
    const tracking = JSON.parse(
      localStorage.getItem(timeKey) || '{}'
    ) as Record<
      string,
      {
        morning: number; // 6 AM - 10 AM
        workday: number; // 9 AM - 6 PM
        evening: number; // 6 PM - midnight
        weekend: number; // Saturday/Sunday
      }
    >;

    if (!tracking[ssid]) {
      tracking[ssid] = { morning: 0, workday: 0, evening: 0, weekend: 0 };
    }

    const isWeekend = [0, 6].includes(new Date().getDay()); // Sunday = 0, Saturday = 6

    if (isWeekend) {
      tracking[ssid].weekend++;
    } else {
      if (currentHour >= 6 && currentHour < 10) {
        tracking[ssid].morning++;
      }
      if (currentHour >= 9 && currentHour < 18) {
        tracking[ssid].workday++;
      }
      if (currentHour >= 18 || currentHour < 6) {
        tracking[ssid].evening++;
      }
    }

    localStorage.setItem(timeKey, JSON.stringify(tracking));
    return tracking;
  }, []);

  const getDominantSSID = (counts: Record<string, number>) => {
    let top = '';
    let topCount = 0;
    let second = 0;
    for (const [ssid, count] of Object.entries(counts)) {
      if (count > topCount) {
        second = topCount;
        top = ssid;
        topCount = count;
      } else if (count > second) {
        second = count;
      }
    }
    return { ssid: top, count: topCount, second };
  };

  // Persist WiFi SSID to user profile in database
  const persistSSID = useCallback(
    async (field: 'home_wifi_ssid' | 'work_wifi_ssid', ssid: string) => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
          .from('profiles')
          .update({ [field]: ssid })
          .eq('id', user.id);

        if (error) {
          console.error('Failed to persist SSID', error);
        }
      } catch (err) {
        console.error('Failed to persist SSID', err);
      }
    },
    []
  );

  // Determine if WiFi should be classified as home or work based on time patterns
  const classifyWifiByTimePattern = useCallback(
    (
      tracking: Record<
        string,
        { morning: number; workday: number; evening: number; weekend: number }
      >
    ) => {
      for (const [ssid, times] of Object.entries(tracking)) {
        const totalUsage =
          times.morning + times.workday + times.evening + times.weekend;

        // Need at least 10 data points to make a classification
        if (totalUsage < 10) continue;

        // Home WiFi: Used in both morning AND evening, or heavily on weekends
        const isHomePatter =
          (times.morning >= 3 && times.evening >= 3) ||
          (times.weekend >= 5 && times.weekend > times.workday);

        // Work WiFi: Used primarily during work hours, but NOT heavily in evening/morning
        const isWorkPattern =
          times.workday >= 8 &&
          times.workday > (times.morning + times.evening) * 1.5 &&
          times.weekend < times.workday * 0.3;

        if (isHomePatter && ssid !== settings.homeWifiSSID) {
          logger.debug(
            `🏠 Auto-detected HOME WiFi: ${ssid} (morning: ${times.morning}, evening: ${times.evening}, weekend: ${times.weekend})`
          );
          updateSettings({ homeWifiSSID: ssid });
          persistSSID('home_wifi_ssid', ssid);
        }

        if (
          isWorkPattern &&
          ssid !== settings.workWifiSSID &&
          ssid !== settings.homeWifiSSID
        ) {
          logger.debug(
            `🏢 Auto-detected WORK WiFi: ${ssid} (workday: ${times.workday}, morning: ${times.morning}, evening: ${times.evening})`
          );
          updateSettings({ workWifiSSID: ssid });
          persistSSID('work_wifi_ssid', ssid);
        }
      }
    },
    [settings.homeWifiSSID, settings.workWifiSSID, updateSettings, persistSSID]
  );

  // Pure context determination function without side effects
  const determineContext = useCallback(
    (inputs: AutoContextInputs): string => {
      if (!settings.enabled) {
        return '';
      }

      const { location, speed = 0 } = inputs;
      const currentHour = new Date().getHours();
      const currentDay = new Date().getDay(); // 0 = Sunday, 6 = Saturday
      const isWeekend = currentDay === 0 || currentDay === 6;

      // Get current WiFi without updating state
      const newWifiSSID = getCurrentWifiSSID();
      const isConnectedToWifi = !!newWifiSSID;
      
      // Real movement detection
      const isMoving = speed > 1;

      console.log(`🔍 AutoContext evaluation:`, {
        newWifiSSID,
        isConnectedToWifi,
        currentHour,
        isWeekend,
        speed,
        isMoving,
        location: location ? `${location.latitude}, ${location.longitude}` : 'none'
      });

      const gpsQuality =
        location && location.accuracy && location.accuracy < 50
          ? 'good'
          : 'poor';

      // Real car detection (would need Bluetooth API in real app)
      const isCarConnected = false; // await isConnectedToCarBluetooth();
      const cellularSignal = getCellularSignal();

      let insideHomeArea = false;
      let insideWorkArea = false;

      if (location && settings.homeArea) {
        insideHomeArea = isInsideArea(
          location.latitude,
          location.longitude,
          settings.homeArea.latitude,
          settings.homeArea.longitude,
          settings.homeArea.radius
        );
      }

      if (location && settings.workArea) {
        insideWorkArea = isInsideArea(
          location.latitude,
          location.longitude,
          settings.workArea.latitude,
          settings.workArea.longitude,
          settings.workArea.radius
        );
      }

      // Prepare evaluation data for rule engine
      const evaluationData: AutoContextEvaluationData = {
        wifi: {
          home: false, // Not using specific home WiFi anymore
          work: false, // Not using specific work WiFi anymore
          known: isConnectedToWifi, // Any WiFi connection
          currentSSID: newWifiSSID,
          previousSSID: currentWifiSSID,
        },
        location: {
          insideHome: insideHomeArea,
          insideWork: insideWorkArea,
          gpsQuality,
        },
        movement: {
          speed,
          isMoving,
        },
        time: {
          currentHour,
          isWeekend,
        },
        connectivity: {
          cellularSignal,
          carBluetooth: isCarConnected,
        },
        weather: {
          main: weatherData?.weather_main || 'Clear',
          temperature: weatherData?.temperature || 20,
          humidity: weatherData?.humidity || 50,
        },
        context: {
          latestContext,
        },
      };

      // Use custom rules if available, otherwise use default rules
      const rulesToUse =
        settings.customRules && settings.customRules.length > 0
          ? settings.customRules
          : DEFAULT_AUTO_CONTEXT_RULES;

      let state = evaluateAutoContextRules(rulesToUse, evaluationData);

      console.log(`📋 AutoContext rule result: "${state}"`, {
        evaluationData,
        rulesCount: rulesToUse.length,
        firstFewRules: rulesToUse.slice(0, 3).map(r => ({ id: r.id, priority: r.priority, result: r.result }))
      });

      // Apply ML model if enabled and available
      if (settings.mlEnabled && model) {
        try {
          const mlState = tf.tidy(() => {
            const tensor = convertToTensor({ ...inputs, isMoving });
            const prediction = model.predict(tensor) as tf.Tensor;
            const index = prediction.argMax(-1).dataSync()[0];
            return MODEL_LABELS[index];
          });
          if (mlState) state = mlState;
        } catch (err) {
          console.error('ML prediction failed', err);
        }
      }

      // Override ML predictions for car bluetooth detection (highest priority)
      if (isCarConnected && speed > 5) {
        state = 'Driving';
        logger.debug(`🚗 Override context to Driving due to car bluetooth + speed`);
      }

      console.log(`✅ Final AutoContext result: "${state}"`);
      return state;
    },
    [
      settings,
      currentWifiSSID,
      latestContext,
      weatherData,
      getCurrentWifiSSID,
      getCellularSignal,
      isInsideArea,
      model,
      convertToTensor,
    ]
  );

  // Separate effect to handle WiFi state updates - runs periodically instead of constantly
  useEffect(() => {
    if (!settings.enabled) return;

    const checkWifiStatus = () => {
      const newWifiSSID = getCurrentWifiSSID();
      if (newWifiSSID !== currentWifiSSID) {
        setPreviousWifiSSID(currentWifiSSID);
        setCurrentWifiSSID(newWifiSSID);
        
        // Track WiFi usage patterns for automatic home/work detection
        const wifiTracking = trackWifiByTime(newWifiSSID);
        classifyWifiByTimePattern(wifiTracking);
      }
    };

    // Check WiFi status immediately
    checkWifiStatus();

    // Set up interval to check WiFi status every 10 seconds instead of every render
    const interval = setInterval(checkWifiStatus, 10000);

    return () => clearInterval(interval);
  }, [settings.enabled, getCurrentWifiSSID, currentWifiSSID, trackWifiByTime, classifyWifiByTimePattern]);

  // Separate function to update context (called from RealTime component)
  const updateLatestContext = useCallback((context: string) => {
    if (context !== latestContext) {
      setLatestContext(context);
    }
  }, [latestContext]);

  return useMemo(
    () => ({
      settings,
      updateSettings,
      toggleEnabled,
      determineContext,
      updateLatestContext,
      latestContext,
      isEnabled: settings.enabled,
      mlEnabled: settings.mlEnabled,
      highAccuracy: settings.highAccuracy,
      latestLocation,
      locationEnabled,
      requestLocationPermission,
    }),
    [
      settings,
      updateSettings,
      toggleEnabled,
      determineContext,
      updateLatestContext,
      latestContext,
      latestLocation,
      locationEnabled,
      requestLocationPermission,
    ]
  );
}
