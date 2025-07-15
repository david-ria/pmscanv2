import { useState, useEffect, useCallback, useContext } from 'react';
import * as tf from '@tensorflow/tfjs';
import { PMScanData } from '@/lib/pmscan/types';
import { LocationData } from '@/types/PMScan';
import { useGPS } from '@/hooks/useGPS';
import { useRecordingContext } from '@/contexts/RecordingContext';
import { MODEL_LABELS } from '@/lib/recordingConstants';
import { supabase } from '@/integrations/supabase/client';
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

export function useAutoContext() {
  const [settings, setSettings] = useState<AutoContextSettings>(() => {
    const saved = localStorage.getItem('autoContextSettings');
    return saved
      ? JSON.parse(saved)
      : {
          enabled: false,
          mlEnabled: false,
          highAccuracy: false,
          overrideContext: false,
        };
  });

  // Use the recording context directly - this should work if properly wrapped
  console.log('useAutoContext: Attempting to access RecordingContext');
  const recordingContext = useRecordingContext();
  console.log(
    'useAutoContext: Successfully accessed RecordingContext',
    recordingContext
  );

  const { updateMissionContext, missionContext, isRecording } =
    recordingContext;

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

  const updateSettings = useCallback(
    (newSettings: Partial<AutoContextSettings>) => {
      setSettings((prev) => ({ ...prev, ...newSettings }));
    },
    []
  );

  const toggleEnabled = useCallback(() => {
    setSettings((prev) => ({ ...prev, enabled: !prev.enabled }));
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('autoContextSettings', JSON.stringify(settings));
  }, [settings]);

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
          setSettings((prev) => ({
            ...prev,
            homeWifiSSID: data.home_wifi_ssid || prev.homeWifiSSID,
            workWifiSSID: data.work_wifi_ssid || prev.workWifiSSID,
          }));
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

  // Toggle high accuracy based on recording state
  useEffect(() => {
    if (settings.enabled && settings.highAccuracy !== isRecording) {
      updateSettings({ highAccuracy: isRecording });
    }
  }, [isRecording, settings.enabled, settings.highAccuracy, updateSettings]);

  // Mock function to get current WiFi SSID (in real app, this would use native APIs)
  const getCurrentWifiSSID = useCallback((): string => {
    // Check for test WiFi SSID from localStorage first
    const testWifi = localStorage.getItem('mock_wifi_ssid');
    if (testWifi) {
      return testWifi;
    }

    // In a real implementation, this would use Capacitor's Network plugin
    // For now, we'll return a mock value only if online
    return navigator.onLine ? 'MockWiFi' : '';
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

  // Mock function to get cellular signal strength
  const getCellularSignal = useCallback((): boolean => {
    // In a real implementation, this would use device APIs
    return navigator.onLine;
  }, []);

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
          console.log(
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
          console.log(
            `🏢 Auto-detected WORK WiFi: ${ssid} (workday: ${times.workday}, morning: ${times.morning}, evening: ${times.evening})`
          );
          updateSettings({ workWifiSSID: ssid });
          persistSSID('work_wifi_ssid', ssid);
        }
      }
    },
    [settings.homeWifiSSID, settings.workWifiSSID, updateSettings, persistSSID]
  );

  // Main auto context determination function using configurable rules
  const determineContext = useCallback(
    (inputs: AutoContextInputs): string => {
      if (!settings.enabled) {
        return '';
      }

      const { location, speed = 0 } = inputs;
      const currentHour = new Date().getHours();

      // Update WiFi tracking
      const newWifiSSID = getCurrentWifiSSID();
      if (newWifiSSID !== currentWifiSSID) {
        setPreviousWifiSSID(currentWifiSSID);
        setCurrentWifiSSID(newWifiSSID);
      }

      const gpsQuality =
        location && location.accuracy && location.accuracy < 50
          ? 'good'
          : 'poor';

      const isCarConnected = false; // await isConnectedToCarBluetooth();
      const cellularSignal = getCellularSignal();
      const isMoving = speed > 1;

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

      // Track WiFi usage patterns for automatic home/work detection
      const wifiTracking = trackWifiByTime(newWifiSSID);
      classifyWifiByTimePattern(wifiTracking);

      // Prepare evaluation data for rule engine
      const evaluationData: AutoContextEvaluationData = {
        wifi: {
          home: currentWifiSSID === settings.homeWifiSSID,
          work: currentWifiSSID === settings.workWifiSSID,
          known: !!(
            currentWifiSSID &&
            (currentWifiSSID === settings.homeWifiSSID ||
              currentWifiSSID === settings.workWifiSSID)
          ),
          currentSSID: currentWifiSSID,
          previousSSID: previousWifiSSID,
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
        },
        connectivity: {
          cellularSignal,
          carBluetooth: isCarConnected,
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
      }

      setLatestContext(state);
      if (settings.overrideContext && state) {
        if (missionContext.activity !== state) {
          updateMissionContext(missionContext.location, state);
        }
      }

      return state;
    },
    [
      settings,
      currentWifiSSID,
      previousWifiSSID,
      latestContext,
      getCurrentWifiSSID,
      getCellularSignal,
      isInsideArea,
      trackWifiByTime,
      classifyWifiByTimePattern,
      model,
      convertToTensor,
      missionContext,
      updateMissionContext,
    ]
  );

  return {
    settings,
    updateSettings,
    toggleEnabled,
    determineContext,
    latestContext,
    isEnabled: settings.enabled,
    mlEnabled: settings.mlEnabled,
    highAccuracy: settings.highAccuracy,
    latestLocation,
    locationEnabled,
    requestLocationPermission,
  };
}
