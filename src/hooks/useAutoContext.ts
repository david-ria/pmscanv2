import { useState, useEffect, useCallback, useMemo } from 'react';
import * as logger from '@/utils/logger';
import { PMScanData } from '@/lib/pmscan/types';
import { LocationData } from '@/types/PMScan';
import { useGPS } from '@/hooks/useGPS';
import { useWeatherService } from '@/hooks/useWeatherService';
import { MODEL_LABELS } from '@/lib/recordingConstants';
import { supabase } from '@/integrations/supabase/client';
import { useStorageSettings } from '@/hooks/useStorage';
import { STORAGE_KEYS } from '@/services/storageService';
import { useSubscription } from '@/hooks/useSubscription';
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
import { calculateDataQuality } from '@/lib/autoContext.config';

// Development telemetry logging
function logTransition(prev: string, next: string, data: AutoContextEvaluationData) {
  if (process.env.NODE_ENV !== 'development') return;
  if (prev === next) return;
  // eslint-disable-next-line no-console
  console.debug('[AutoContext]', `${prev} -> ${next}`, {
    speed: Math.round((data.movement.speed ?? 0) * 10) / 10,
    gpsQuality: data.location.gpsQuality,
    walkingSignature: data.movement.walkingSignature ?? null,
    dataQuality: data.movement.dataQuality ?? null,
  });
}

// Fallback data for when UnifiedDataProvider is not available
const getFallbackUnifiedData = () => ({
  walkingSignature: { 
    isWalking: false, 
    confidence: 0, 
    steps: 0, 
    cadence: 0, 
    stride: 0, 
    stepsPerMinute: 0,
    isActive: false
  }
});

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
    radius: number;
  };
  workArea?: {
    latitude: number;
    longitude: number;
    radius: number;
  };
  homeWifiSSID?: string;
  workWifiSSID?: string;
  customRules?: AutoContextRule[];
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
  const { features } = useSubscription();
  
  // Use fallback unified data since UnifiedDataProvider might not be available
  const unifiedData = useMemo(() => getFallbackUnifiedData(), []);

  const [previousWifiSSID, setPreviousWifiSSID] = useState<string>('');
  const [currentWifiSSID, setCurrentWifiSSID] = useState<string>('');
  const [latestContext, setLatestContext] = useState<string>('');
  const [model, setModel] = useState<any | null>(null);
  
  // Use external location if provided, otherwise initialize own GPS
  const gpsResult = useGPS(
    enableActiveScanning && settings.enabled && !externalLocation,
    settings.highAccuracy ?? false
  );
  const { locationEnabled, latestLocation: gpsLocation, requestLocationPermission, speedKmh, gpsQuality } = gpsResult;
  const latestLocation = externalLocation || gpsLocation;
  
  const { weatherData } = useWeatherService();
  const { sensorData, updateGPSAccuracy, updateAltitudeFromGPS, detectUndergroundActivity, startSensorListening, stopSensorListening, initializeReference } = useSensorData();

  const toggleEnabled = useCallback((enabled?: boolean) => {
    const newEnabled = enabled !== undefined ? enabled : !settings.enabled;
    if (newEnabled && !features.canUseAutoContext) {
      return;
    }
    updateSettings({ enabled: newEnabled });
  }, [settings.enabled, updateSettings, features.canUseAutoContext]);

  // Load WiFi SSIDs from user profile
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
  }, [updateSettings, settings.homeWifiSSID, settings.workWifiSSID]);

  // Load ML model if enabled
  useEffect(() => {
    if (settings.mlEnabled && !model) {
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

  // Real WiFi detection function
  const getCurrentWifiSSID = useCallback((): string => {
    if (!navigator.onLine) {
      return '';
    }

    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;
    
    if (connection) {
      const connectionType = connection.type;
      const effectiveType = connection.effectiveType;
      
      logger.rateLimitedDebug(
        'autocontext.network',
        30000,
        'Network connection details:',
        {
          type: connectionType,
          effectiveType: effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt
        }
      );
      
      if (connectionType === 'wifi' || connectionType === 'ethernet') {
        logger.rateLimitedDebug('autocontext.wifi', 30000, 'WiFi detection - detected WiFi connection');
        return 'WiFi-Connection';
      } else if (connectionType === 'cellular') {
        logger.rateLimitedDebug('autocontext.cellular', 30000, 'WiFi detection - detected cellular connection');
        return '';
      } else if (effectiveType && ['4g', '3g'].includes(effectiveType)) {
        logger.rateLimitedDebug('autocontext.highspeed', 30000, 'WiFi detection - high-speed connection, type unclear');
        return '';
      }
    }
    
    logger.rateLimitedDebug('autocontext.fallback', 30000, 'WiFi detection - Network API not available or inconclusive, not assuming WiFi');
    return '';
  }, []);

  // Determine context based on current conditions
  const determineContext = useCallback(async (): Promise<string> => {
    if (!settings.enabled) return '';
    
    const speed = speedKmh || 0;
    const currentHour = new Date().getHours();
    
    if (speed > 30) {
      return 'driving';
    } else if (speed > 5) {
      return 'walking';
    } else if (currentHour >= 9 && currentHour <= 17) {
      return 'working';
    } else {
      return 'stationary';
    }
  }, [settings.enabled, speedKmh]);

  // Update latest context
  const updateLatestContext = useCallback((context: string) => {
    if (context !== latestContext) {
      setLatestContext(context);
    }
  }, [latestContext]);

  // Auto-detect context when conditions change
  useEffect(() => {
    if (settings.enabled) {
      determineContext().then(context => {
        updateLatestContext(context);
      });
    }
  }, [settings.enabled, speedKmh, latestLocation, determineContext, updateLatestContext]);

  return useMemo(
    () => ({
      settings,
      updateSettings,
      toggleEnabled,
      determineContext,
      updateLatestContext,
      latestContext,
      isEnabled: settings.enabled && features.canUseAutoContext,
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
      features.canUseAutoContext,
      externalLocation
    ]
  );
}