import { useState, useEffect, useCallback, useMemo } from 'react';
// Lazy load TensorFlow to reduce initial bundle size
import * as logger from '@/utils/logger';
import { PMScanData } from '@/lib/pmscan/types';
import { LocationData } from '@/types/PMScan';
import { useGPS } from '@/hooks/useGPS';
import { useWeatherService } from '@/hooks/useWeatherService';
import { MODEL_LABELS } from '@/lib/recordingConstants';
import { supabase } from '@/integrations/supabase/client';
import { useStorageSettings } from '@/hooks/useStorage';
import { STORAGE_KEYS } from '@/services/storageService';
import { Capacitor } from '@capacitor/core';
import { BleClient } from '@capacitor-community/bluetooth-le';
import {
  DEFAULT_AUTO_CONTEXT_RULES,
  AutoContextRule,
  AutoContextEvaluationData,
  evaluateAutoContextRules,
  AutoContextConfig,
} from '@/lib/autoContextConfig';
import { useSensorData } from '@/hooks/useSensorData';

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

export function useAutoContext(enableActiveScanning: boolean = true, externalLocation?: LocationData | null) {
  const { settings, updateSettings } = useStorageSettings(
    STORAGE_KEYS.AUTO_CONTEXT_SETTINGS,
    DEFAULT_SETTINGS
  );

  const [previousWifiSSID, setPreviousWifiSSID] = useState<string>('');
  const [currentWifiSSID, setCurrentWifiSSID] = useState<string>('');
  const [latestContext, setLatestContext] = useState<string>('');
  const [model, setModel] = useState<any | null>(null);
  const homeCountsKey = 'homeWifiCounts';
  const workCountsKey = 'workWifiCounts';
  // Use external location if provided, otherwise initialize own GPS
  const gpsResult = useGPS(
    !externalLocation && settings.enabled && enableActiveScanning,
    settings.highAccuracy ?? false
  );
  
  const { locationEnabled, latestLocation: gpsLocation, requestLocationPermission } = gpsResult;
  const latestLocation = externalLocation || gpsLocation;
  
  const { weatherData } = useWeatherService();
  
  // Hook pour les capteurs de détection des transports souterrains
  const { sensorData, updateGPSAccuracy, updateAltitudeFromGPS, detectUndergroundActivity, startSensorListening, stopSensorListening, initializeReference } = useSensorData();

  const toggleEnabled = useCallback(() => {
    updateSettings({ enabled: !settings.enabled });
  }, [settings.enabled, updateSettings]);

  // Save settings to localStorage whenever they change - handled by useStorageSettings

  // Load WiFi SSIDs from user profile (stabilized with useCallback)
  const loadSSIDs = useCallback(async () => {
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
        // Only update if the values are actually different
        const currentHomeSSID = settings.homeWifiSSID;
        const currentWorkSSID = settings.workWifiSSID;
        const newHomeSSID = data.home_wifi_ssid;
        const newWorkSSID = data.work_wifi_ssid;
        
        if (newHomeSSID !== currentHomeSSID || newWorkSSID !== currentWorkSSID) {
          updateSettings({
            homeWifiSSID: newHomeSSID || currentHomeSSID,
            workWifiSSID: newWorkSSID || currentWorkSSID,
          });
        }
      }
    } catch (error) {
      console.error('Error loading WiFi SSIDs:', error);
    }
  }, [updateSettings]); // Remove settings dependencies to prevent loops

  useEffect(() => {
    if (settings.enabled) {
      loadSSIDs();
    }
  }, [settings.enabled, loadSSIDs]);

  useEffect(() => {
    if (settings.mlEnabled && !model) {
      // Lazy load TensorFlow only when ML is enabled
      import('@tensorflow/tfjs').then(tf => {
        tf.loadLayersModel('/model/model.json')
          .then(setModel)
          .catch((err) => {
            console.error('Failed to load ML model', err);
            setModel(null);
          });
      }).catch(err => {
        console.error('Failed to load TensorFlow', err);
      });
    }
  }, [settings.mlEnabled, model]);

  useEffect(() => {
    if (settings.enabled && enableActiveScanning && !externalLocation) {
      requestLocationPermission().catch((err) => {
        console.error('Failed to request location permission', err);
      });
      
      // Activer les capteurs pour la détection des transports souterrains
      startSensorListening().catch((err) => {
        console.error('Failed to start sensor listening', err);
      });
    } else {
      // Désactiver les capteurs quand l'auto-contexte est désactivé
      stopSensorListening().catch((err) => {
        console.error('Failed to stop sensor listening', err);
      });
    }
  }, [settings.enabled, enableActiveScanning, externalLocation, requestLocationPermission, startSensorListening, stopSensorListening]);

  // Real WiFi detection function
  const getCurrentWifiSSID = useCallback((): string => {
    // Check if we're online first
    if (!navigator.onLine) {
      console.log('WiFi detection - offline, no connection');
      return '';
    }

    // Try to use Network Information API to detect connection type
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;
    
    if (connection) {
      const connectionType = connection.type;
      const effectiveType = connection.effectiveType;
      
      // Use rate-limited logging to prevent excessive console spam
      logger.rateLimitedDebug(
        'autocontext.network',
        30000, // Log at most once every 30 seconds
        'Network connection details:',
        {
          type: connectionType,
          effectiveType: effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt
        }
      );
      
      // Check if connection type indicates WiFi
      if (connectionType === 'wifi' || connectionType === 'ethernet') {
        logger.rateLimitedDebug('autocontext.wifi', 30000, 'WiFi detection - detected WiFi connection');
        return 'WiFi-Connection';
      } else if (connectionType === 'cellular') {
        logger.rateLimitedDebug('autocontext.cellular', 30000, 'WiFi detection - detected cellular connection');
        return '';
      } else if (effectiveType && ['4g', '3g'].includes(effectiveType)) {
        // High-speed connection but unclear type - be conservative
        logger.rateLimitedDebug('autocontext.highspeed', 30000, 'WiFi detection - high-speed connection, type unclear');
        return ''; // Don't assume WiFi
      }
    }
    
    // Fallback: don't assume WiFi if we can't detect it properly
    logger.rateLimitedDebug('autocontext.fallback', 30000, 'WiFi detection - Network API not available or inconclusive, not assuming WiFi');
    return '';
  }, []);

  // Check if connected to car bluetooth (or simulate driving detection on web)
  const isConnectedToCarBluetooth = useCallback(async (): Promise<boolean> => {
    try {
      // Only use Bluetooth on native platforms
      if (!Capacitor.isNativePlatform()) {
        // On web platforms, use speed-based detection as a proxy for driving
        logger.debug('Bluetooth: Web platform - using speed-based car detection');
        return false; // Let speed detection handle it
      }

      // Initialize BLE if not already done
      await BleClient.initialize();

      // Check if Bluetooth is enabled
      const isEnabled = await BleClient.isEnabled();
      if (!isEnabled) {
        logger.debug('Bluetooth: Not enabled');
        return false;
      }

      // Get connected devices
      const connectedDevices = await BleClient.getConnectedDevices([]);
      
      // Check if any connected device appears to be a car
      const carDevices = connectedDevices.filter(device => {
        const name = device.name?.toLowerCase() || '';
        // Common car bluetooth identifiers
        return name.includes('car') || 
               name.includes('auto') || 
               name.includes('vehicle') ||
               name.includes('honda') ||
               name.includes('toyota') ||
               name.includes('ford') ||
               name.includes('bmw') ||
               name.includes('audi') ||
               name.includes('mercedes') ||
               name.includes('volkswagen') ||
               name.includes('nissan') ||
               name.includes('mazda') ||
               name.includes('hyundai') ||
               name.includes('kia') ||
               name.includes('lexus') ||
               name.includes('acura') ||
               name.includes('infiniti');
      });

      const isCarConnected = carDevices.length > 0;
      if (isCarConnected) {
        logger.debug('Bluetooth: Car device connected', carDevices[0].name);
      }
      
      return isCarConnected;
    } catch (error) {
      logger.error('Bluetooth: Error checking car connection', error);
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
    async (inputs: AutoContextInputs): Promise<any> => {
      const tf = await import('@tensorflow/tfjs');
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
  const saveSSIDToProfile = useCallback(
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
          console.error('Error saving SSID to profile:', error);
        }
      } catch (error) {
        console.error('Error saving SSID to profile:', error);
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
          saveSSIDToProfile('home_wifi_ssid', ssid);
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
          saveSSIDToProfile('work_wifi_ssid', ssid);
        }
      }
    },
    [settings.homeWifiSSID, settings.workWifiSSID, updateSettings, saveSSIDToProfile]
  );

  // Pure context determination function without side effects
  const determineContext = useCallback(
    async (inputs: AutoContextInputs): Promise<string> => {
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
      
      // Gestion intelligente GPS vs capteurs pour underground
      updateGPSAccuracy(location?.accuracy);
      
      const hasGoodGPS = location?.accuracy && location.accuracy < 20;
      const hasLowGPSAccuracy = !location?.accuracy || location.accuracy > 100;
      
      // Initialiser la référence quand on a un bon GPS (surface)
      if (hasGoodGPS && location?.altitude !== undefined) {
        updateAltitudeFromGPS(location.altitude, location.accuracy);
        initializeReference(location.altitude);
      }
      
      // LOGIQUE PRINCIPALE : Détection des transports souterrains
      // Si perte GPS (underground), utiliser le modèle de capteurs
      if (hasLowGPSAccuracy && settings.enabled) {
        const undergroundActivity = detectUndergroundActivity(sensorData);
        if (undergroundActivity !== 'unknown') {
          logger.debug(`🚇 Transport souterrain détecté: ${undergroundActivity} (GPS accuracy: ${location?.accuracy || 'none'}, altitude relative: ${sensorData.barometer_relativeAltitude})`);
          
          // Mapper les activités détectées vers les contextes de l'app
          switch (undergroundActivity) {
            case 'escalator':
            case 'stairs':
            case 'stairs to outside':
              return 'Underground Transport';
            case 'stand':
            case 'stand platform':
              return 'Underground Station';
            default:
              return 'Underground';
          }
        }
      }

      // Real car detection using Bluetooth API
      const isCarConnected = await isConnectedToCarBluetooth();
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
          const tf = await import('@tensorflow/tfjs');
          const mlState = tf.tidy(() => {
            const tensor = convertToTensor({ ...inputs, isMoving });
            const prediction = model.predict(tensor) as any;
            const index = prediction.argMax(-1).dataSync()[0];
            return MODEL_LABELS[index];
          });
          if (mlState) state = mlState;
        } catch (err) {
          console.error('ML prediction failed', err);
        }
      }

      // Override for high-speed movement detection (enhanced driving detection)
      if (speed > 15) { // 15 km/h or higher indicates likely vehicle transport
        if (speed > 25) {
          state = 'Driving'; // High confidence driving
        } else {
          state = 'Transport'; // Could be bus, bike, etc.
        }
        logger.debug(`🚗 Override context to ${state} due to speed: ${speed} km/h`);
      } else if (isCarConnected && speed > 5) {
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
      isConnectedToCarBluetooth,
      model,
      convertToTensor,
    ]
  );

  // Separate effect to handle WiFi state updates - runs periodically instead of constantly
  useEffect(() => {
    if (!settings.enabled || (!enableActiveScanning && !externalLocation)) return;

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
  }, [settings.enabled, enableActiveScanning, externalLocation, getCurrentWifiSSID, currentWifiSSID, trackWifiByTime, classifyWifiByTimePattern]);

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
      locationEnabled: externalLocation ? true : locationEnabled,
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
