import { useState, useEffect, useCallback } from 'react';
import { PMScanData } from '@/lib/pmscan/types';
import { LocationData } from '@/types/PMScan';

interface AutoContextInputs {
  pmData?: PMScanData;
  location?: LocationData;
  speed?: number;
  isMoving?: boolean;
}

interface AutoContextSettings {
  enabled: boolean;
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
    return saved ? JSON.parse(saved) : { enabled: false };
  });

  const [previousWifiSSID, setPreviousWifiSSID] = useState<string>('');
  const [currentWifiSSID, setCurrentWifiSSID] = useState<string>('');

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('autoContextSettings', JSON.stringify(settings));
  }, [settings]);

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

    let state = "Unknown";

    if (gpsQuality === "good") {
      if (insideHomeArea) {
        if (currentWifiSSID === settings.homeWifiSSID) {
          state = "Indoor at home";
        } else {
          state = "Outdoor";
        }
      } else if (insideWorkArea) {
        if (currentWifiSSID === settings.workWifiSSID) {
          state = "Indoor at work";
        } else {
          state = "Outdoor";
        }
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
      if (currentWifiSSID === settings.homeWifiSSID) {
        if (WORK_START <= currentHour && currentHour <= WORK_END) {
          if (previousWifiSSID === settings.homeWifiSSID) {
            state = "Indoor at home (working from home)";
          } else {
            state = "Indoor at home";
          }
        } else {
          state = "Indoor at home";
        }
      } else if (currentWifiSSID === settings.workWifiSSID) {
        if (WORK_START <= currentHour && currentHour <= WORK_END) {
          state = "Indoor at work";
        } else {
          state = "Indoor";
        }
      } else {
        if (!cellularSignal && isMoving) {
          state = "Underground transport";
        } else {
          state = "Indoor";
        }
      }
    }

    return state;
  }, [settings, currentWifiSSID, previousWifiSSID, getCurrentWifiSSID, getCellularSignal, isInsideArea]);

  const updateSettings = useCallback((newSettings: Partial<AutoContextSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const toggleEnabled = useCallback(() => {
    setSettings(prev => ({ ...prev, enabled: !prev.enabled }));
  }, []);

  return {
    settings,
    updateSettings,
    toggleEnabled,
    determineContext,
    isEnabled: settings.enabled
  };
}