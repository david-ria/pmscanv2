import { useState, useEffect, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';
import { PMScanData } from '@/lib/pmscan/types';
import { LocationData } from '@/types/PMScan';
import { useGPS } from '@/hooks/useGPS';
import { useRecordingContext } from '@/contexts/RecordingContext';
import { MODEL_LABELS } from '@/lib/recordingConstants';
import { supabase } from '@/integrations/supabase/client';

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
}

export function useAutoContext() {
  const [settings, setSettings] = useState<AutoContextSettings>(() => {
    const saved = localStorage.getItem('autoContextSettings');
    return saved ? JSON.parse(saved) : { enabled: false, mlEnabled: false, highAccuracy: false, overrideContext: false };
  });

  const { updateMissionContext, missionContext } = useRecordingContext();

  const [previousWifiSSID, setPreviousWifiSSID] = useState<string>('');
  const [currentWifiSSID, setCurrentWifiSSID] = useState<string>('');
  const [latestContext, setLatestContext] = useState<string>('');
  const [model, setModel] = useState<tf.LayersModel | null>(null);
  const homeCountsKey = 'homeWifiCounts';
  const workCountsKey = 'workWifiCounts';
  const { locationEnabled, latestLocation, requestLocationPermission } = useGPS(settings.enabled, settings.highAccuracy ?? false);

  const updateSettings = useCallback((newSettings: Partial<AutoContextSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const toggleEnabled = useCallback(() => {
    setSettings(prev => ({ ...prev, enabled: !prev.enabled }));
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('autoContextSettings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const loadSSIDs = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data, error } = await supabase
          .from('profiles')
          .select('home_wifi_ssid, work_wifi_ssid')
          .eq('id', user.id)
          .single();
        if (!error && data) {
          setSettings(prev => ({
            ...prev,
            homeWifiSSID: prev.homeWifiSSID ?? data.home_wifi_ssid ?? undefined,
            workWifiSSID: prev.workWifiSSID ?? data.work_wifi_ssid ?? undefined
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
        .catch(err => {
          console.error('Failed to load ML model', err);
          setModel(null);
        });
    }
  }, [settings.mlEnabled, model]);

  useEffect(() => {
    if (settings.enabled) {
      requestLocationPermission().catch(err => {
        console.error('Failed to request location permission', err);
      });
    }
  }, [settings.enabled, requestLocationPermission]);

  // Mock function to get current WiFi SSID (in real app, this would use native APIs)
  const getCurrentWifiSSID = useCallback((): string => {
    // In a real implementation, this would use Capacitor's Network plugin
    // For now, we'll return a mock value
    return navigator.onLine ? 'MockWiFi' : '';
  }, []);

  // Mock function to get cellular signal strength
  const getCellularSignal = useCallback((): boolean => {
    // In a real implementation, this would use device APIs
    return navigator.onLine;
  }, []);

  // Check if a location is within an area
  const isInsideArea = useCallback((
    currentLat: number,
    currentLng: number,
    areaLat: number,
    areaLng: number,
    radiusMeters: number
  ): boolean => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (areaLat - currentLat) * Math.PI / 180;
    const dLng = (areaLng - currentLng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(currentLat * Math.PI / 180) * Math.cos(areaLat * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance <= radiusMeters;
  }, []);

  const convertToTensor = useCallback((inputs: AutoContextInputs): tf.Tensor => {
    const { location, speed = 0, isMoving = false } = inputs;
    const wifiId = currentWifiSSID === settings.homeWifiSSID
      ? 1
      : currentWifiSSID === settings.workWifiSSID
        ? 2
        : 0;
    const data = [
      location?.accuracy ?? 0,
      speed,
      isMoving ? 1 : 0,
      wifiId
    ];
    return tf.tensor2d([data]);
  }, [currentWifiSSID, settings.homeWifiSSID, settings.workWifiSSID]);

  const incrementSSIDCount = useCallback((key: string, ssid: string) => {
    if (!ssid) return {} as Record<string, number>;
    const counts = JSON.parse(localStorage.getItem(key) || '{}') as Record<string, number>;
    counts[ssid] = (counts[ssid] || 0) + 1;
    localStorage.setItem(key, JSON.stringify(counts));
    return counts;
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

  const persistSSID = useCallback(async (field: 'home_wifi_ssid' | 'work_wifi_ssid', ssid: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('profiles').update({ [field]: ssid }).eq('id', user.id);
    } catch (err) {
      console.error('Failed to persist SSID', err);
    }
  }, []);

  const updateDominantSSID = useCallback((area: 'home' | 'work', counts: Record<string, number>) => {
    const { ssid, count, second } = getDominantSSID(counts);
    if (!ssid) return;
    if (count >= 5 && count >= second * 2) {
      if (area === 'home' && ssid !== settings.homeWifiSSID) {
        updateSettings({ homeWifiSSID: ssid });
        persistSSID('home_wifi_ssid', ssid);
      }
      if (area === 'work' && ssid !== settings.workWifiSSID) {
        updateSettings({ workWifiSSID: ssid });
        persistSSID('work_wifi_ssid', ssid);
      }
    }
  }, [persistSSID, settings.homeWifiSSID, settings.workWifiSSID, updateSettings]);

  // Main auto context determination function
  const determineContext = useCallback((inputs: AutoContextInputs): string => {
    if (!settings.enabled) {
      return '';
    }

    const { location, speed = 0 } = inputs;
    const currentHour = new Date().getHours();
    const WORK_START = 8;
    const WORK_END = 18;

    // Update WiFi tracking
    const newWifiSSID = getCurrentWifiSSID();
    if (newWifiSSID !== currentWifiSSID) {
      setPreviousWifiSSID(currentWifiSSID);
      setCurrentWifiSSID(newWifiSSID);
    }

    const gpsQuality = location && location.accuracy && location.accuracy < 50 ? 'good' : 'poor';
    const cellularSignal = getCellularSignal();
    const isMoving = speed > 1; // Consider moving if speed > 1 km/h

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

    if (insideHomeArea) {
      const counts = incrementSSIDCount(homeCountsKey, newWifiSSID);
      updateDominantSSID('home', counts);
    }
    if (insideWorkArea) {
      const counts = incrementSSIDCount(workCountsKey, newWifiSSID);
      updateDominantSSID('work', counts);
    }

    let state = "Unknown";

    const wifiHome = currentWifiSSID === settings.homeWifiSSID;
    const wifiWork = currentWifiSSID === settings.workWifiSSID;

    if (wifiHome) {
      state = "Indoor at home";
      if (
        gpsQuality === "poor" &&
        WORK_START <= currentHour &&
        currentHour <= WORK_END &&
        previousWifiSSID === settings.homeWifiSSID
      ) {
        state = "Indoor at home (working from home)";
      }
    } else if (wifiWork) {
      state = "Indoor at work";
    } else if (gpsQuality === "good") {
      if (insideHomeArea) {
        state = wifiHome ? "Indoor at home" : "Outdoor";
      } else if (insideWorkArea) {
        state = wifiWork ? "Indoor at work" : "Outdoor";
      } else {
        state = "Outdoor";
      }

      if (state === "Outdoor") {
        if (speed < 7) {
          state = "Outdoor walking";
        } else if (speed < 30) {
          state = "Outdoor cycling";
        } else {
          state = "Outdoor transport";
        }
      }
    } else {
      if (
        previousWifiSSID === settings.homeWifiSSID &&
        currentHour >= 8 &&
        currentHour <= 10
      ) {
        state = "Likely indoor at work";
      } else if (!currentWifiSSID && latestContext.startsWith("Indoor")) {
        state = latestContext;
      } else if (!cellularSignal && isMoving) {
        state = "Underground transport";
      } else {
        state = "Indoor";
      }
    }

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

    setLatestContext(state);
    if (settings.overrideContext && state) {
      if (missionContext.activity !== state) {
        updateMissionContext(missionContext.location, state);
      }
    }

    return state;
  }, [settings, currentWifiSSID, previousWifiSSID, getCurrentWifiSSID, getCellularSignal, isInsideArea, convertToTensor, model, missionContext, updateMissionContext]);


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
    requestLocationPermission
  };
}
