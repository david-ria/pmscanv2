import { useState, useCallback, useEffect, useRef } from 'react';
import { SensorReadingData, ISensorAdapter } from '@/types/sensor';
import { rollingBufferService } from '@/services/rollingBufferService';
import { recordingService } from '@/services/recordingService';
import { UNIVERSAL_SCAN_OPTIONS, FILTERED_SCAN_OPTIONS, SensorId } from '@/lib/sensorConstants';
import { 
  getSensorAdapter, 
  identifySensorByService, 
  identifySensorByName,
  getSensorDisplayName 
} from '@/lib/sensorAdapterFactory';
import * as logger from '@/utils/logger';

// Re-export SensorId for backward compatibility
export type { SensorId } from '@/lib/sensorConstants';

const ACTIVE_SENSOR_KEY = 'activeSensorId';

export function useActiveSensor() {
  // Active sensor ID - determined dynamically after connection
  const [activeSensorId, setActiveSensorId] = useState<SensorId | null>(() => {
    const saved = localStorage.getItem(ACTIVE_SENSOR_KEY);
    return saved as SensorId | null;
  });
  
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [currentData, setCurrentData] = useState<SensorReadingData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<{ name: string; battery: number; charging: boolean } | null>(null);

  // Refs to persist across renders
  const adapterRef = useRef<ISensorAdapter | null>(null);
  const deviceRef = useRef<BluetoothDevice | null>(null);
  const serverRef = useRef<BluetoothRemoteGATTServer | null>(null);

  // Internal: Update sensor ID after detection (not exposed)
  const updateSensorId = useCallback((sensorId: SensorId) => {
    localStorage.setItem(ACTIVE_SENSOR_KEY, sensorId);
    setActiveSensorId(sensorId);
  }, []);

  // Handle real-time data from adapter - receives already parsed SensorReadingData
  const handleRTData = useCallback((data: SensorReadingData) => {
    setCurrentData((prevData) => {
      const isDifferent =
        !prevData ||
        Math.abs(prevData.pm25 - data.pm25) >= 0.1 ||
        Math.abs(prevData.pm1 - data.pm1) >= 0.1 ||
        Math.abs(prevData.pm10 - data.pm10) >= 0.1 ||
        data.timestamp.getTime() - prevData.timestamp.getTime() >= 1000;

      if (isDifferent) {
        logger.rateLimitedDebug('sensor-data', 10000,
          `📡 ${adapterRef.current?.name || 'Sensor'} data received`, {
            pm1: data.pm1,
            pm25: data.pm25,
            pm10: data.pm10,
            pressure: data.pressure,
            tvoc: data.tvoc,
            timestamp: data.timestamp.toISOString()
          }
        );

        // Feed data to rolling buffer for averaging ONLY when recording
        if (recordingService.getState().isRecording) {
          rollingBufferService.addReading(data);
        }

        return data;
      }
      return prevData;
    });
  }, []);

  // Handle battery updates from adapter
  const handleBatteryData = useCallback((level: number) => {
    logger.rateLimitedDebug('sensor-battery', 60000, `🔋 Battery: ${level}%`);
    adapterRef.current?.updateBattery(level);
    setDeviceInfo((prev) => prev ? { ...prev, battery: level } : null);
  }, []);

  // Called after GATT connection is established
  const onDeviceConnected = useCallback(async (server: BluetoothRemoteGATTServer, device: BluetoothDevice) => {
    try {
      if (!server.connected) {
        throw new Error('GATT server disconnected before initialization');
      }

      const adapter = adapterRef.current;
      if (!adapter) {
        throw new Error('No active adapter');
      }

      // Initialize notifications with the adapter's specific GATT characteristics
      await adapter.initializeNotifications(server, device, handleRTData, handleBatteryData);

      const reading = adapter.getLiveReading();
      
      setDeviceInfo({
        name: adapter.name,
        battery: reading?.battery ?? 100,
        charging: reading?.charging ?? false
      });
      setIsConnected(true);
      setIsConnecting(false);
      setError(null);

      logger.debug(`✅ ${adapter.name} connected and notifications initialized`);
    } catch (err) {
      logger.debug('❌ Error initializing device:', err);
      setError('Device initialization failed');
      setIsConnecting(false);
      throw err;
    }
  }, [handleRTData, handleBatteryData]);

  // Handle device disconnection
  const onDeviceDisconnected = useCallback(() => {
    logger.debug('🔌 Sensor disconnected');
    setIsConnected(false);
    setDeviceInfo((prev) => prev ? { ...prev, connected: false } : null);
  }, []);

  /**
   * Identify sensor type and connect with the appropriate adapter
   * Called after user selects a device from the browser's Bluetooth dialog
   */
  const identifyAndConnect = useCallback(async (device: BluetoothDevice) => {
    try {
      logger.debug(`🔍 Identifying sensor type for device: ${device.name || 'Unknown'}`);
      
      // 1. Identification par Préfixe de Nom (Méthode la plus fiable et rapide)
      let detectedSensorId: SensorId | undefined;
      const deviceName = device.name?.toUpperCase() || '';

      if (deviceName.startsWith('PMSCAN')) {
        detectedSensorId = 'pmscan';
      } else if (deviceName.includes('AIRBEAM')) {
        detectedSensorId = 'airbeam';
      } else if (deviceName.includes('ATMOTUBE')) {
        detectedSensorId = 'atmotube';
      }
      
      // 2. Connect to GATT server first (required for service-based detection)
      logger.debug('🔗 Connecting to GATT server...');
      if (!device.gatt) {
        throw new Error('GATT server not available on device');
      }
      const server = await device.gatt.connect();
      serverRef.current = server;
      deviceRef.current = device;
      
      // 3. Fallback: Si le nom est inconnu, vérifier les services GATT
      if (!detectedSensorId) {
        logger.debug('🔍 Name detection failed, checking GATT services...');
        try {
          const services = await server.getPrimaryServices();
          for (const service of services) {
            const uuid = service.uuid.toLowerCase();
            logger.debug(`📡 Found service: ${uuid}`);
            
            if (uuid.includes('f3641900')) {
              detectedSensorId = 'pmscan';
              break;
            }
            if (uuid.includes('0000181a')) {
              detectedSensorId = 'airbeam';
              break;
            }
            if (uuid.includes('4b13a770')) {
              detectedSensorId = 'atmotube';
              break;
            }
          }
        } catch (serviceErr) {
          logger.warn('Could not enumerate services, trying direct service detection...');
          // Fallback to identifySensorByService which tries each service individually
          detectedSensorId = await identifySensorByService(server);
        }
      }

      if (!detectedSensorId) {
        throw new Error('Appareil non reconnu. Veuillez choisir un capteur compatible.');
      }
      
      logger.debug(`✅ Detected sensor type: ${getSensorDisplayName(detectedSensorId)}`);
      
      // 4. Charger dynamiquement le bon adaptateur
      const adapter = await getSensorAdapter(detectedSensorId);
      adapterRef.current = adapter;
      
      // 5. Mettre à jour l'état avec l'ID du capteur actif
      updateSensorId(detectedSensorId);
      
      // 6. Set up disconnection handler
      device.addEventListener('gattserverdisconnected', () => {
        onDeviceDisconnected();
      });
      
      // 7. Initialize notifications via the adapter
      await onDeviceConnected(server, device);
      
      logger.debug(`🎉 ${adapter.name} connected and ready`);
      
    } catch (err) {
      logger.error('❌ Error in identifyAndConnect:', err);
      setError(err instanceof Error ? err.message : 'Failed to identify and connect to sensor');
      setIsConnecting(false);
      
      // Clean up on error
      if (serverRef.current?.connected) {
        serverRef.current.disconnect();
      }
      serverRef.current = null;
      deviceRef.current = null;
      throw err;
    }
  }, [updateSensorId, onDeviceConnected, onDeviceDisconnected]);

  /**
   * Request device using universal scan - shows all compatible sensors
   * User selects from browser dialog, then sensor type is auto-detected
   * Stratégie: D'abord essayer avec filtres stricts, sinon scan large
   */
  const requestDevice = useCallback(async () => {
    // Si nous avons déjà un adaptateur actif connecté, ne pas relancer le scan
    if (adapterRef.current && serverRef.current?.connected) {
      logger.debug('ℹ️ Already connected to a sensor');
      return;
    }

    try {
      setError(null);
      setIsConnecting(true);

      let device: BluetoothDevice;

      // Étape 1: Essayer d'abord avec les filtres stricts par nom
      logger.debug('🔍 Step 1: Trying filtered scan for known sensor names...');
      try {
        device = await navigator.bluetooth.requestDevice(FILTERED_SCAN_OPTIONS);
        logger.debug(`📱 Device found with filtered scan: ${device.name || 'Unknown'}`);
      } catch (filteredErr) {
        // Si l'utilisateur annule ou aucun appareil trouvé, essayer le scan large
        if (filteredErr instanceof Error && filteredErr.name === 'NotFoundError') {
          logger.debug('⚠️ Filtered scan cancelled or no devices found, trying wide scan...');
          
          // Étape 2: Scan large - affiche TOUS les appareils Bluetooth
          logger.debug('🔍 Step 2: Wide scan - showing ALL Bluetooth devices...');
          device = await navigator.bluetooth.requestDevice(UNIVERSAL_SCAN_OPTIONS);
          logger.debug(`📱 Device found with wide scan: ${device.name || 'Unknown'}`);
        } else {
          throw filteredErr;
        }
      }

      // Après sélection par l'utilisateur, identifier le capteur et charger l'adaptateur
      await identifyAndConnect(device);

    } catch (err) {
      // User cancelled the dialog or other error
      if (err instanceof Error && err.name === 'NotFoundError') {
        logger.debug('ℹ️ User cancelled Bluetooth device selection');
        setError(null);
      } else {
        logger.error('❌ Error requesting device:', err);
        setError(err instanceof Error ? err.message : 'Failed to connect to device');
      }
      setIsConnecting(false);
    }
  }, [identifyAndConnect]);

  /**
   * Request a specific sensor type (legacy/explicit selection)
   */
  const requestSpecificSensor = useCallback(async (sensorId: SensorId) => {
    try {
      setError(null);
      setIsConnecting(true);

      // Load the adapter for the specific sensor
      const adapter = await getSensorAdapter(sensorId);
      adapterRef.current = adapter;

      logger.debug(`🔍 Requesting specific ${adapter.name} device...`);

      // Use adapter's requestDevice which has sensor-specific filters
      const device = await adapter.requestDevice();
      deviceRef.current = device;

      // Update sensor selection
      updateSensorId(sensorId);

      // Set up disconnection handler
      device.addEventListener('gattserverdisconnected', () => {
        onDeviceDisconnected();
      });

      // Connect to GATT server
      logger.debug(`🔗 Connecting to ${adapter.name} GATT server...`);
      const server = await adapter.connect(device);
      serverRef.current = server;

      // Initialize the device with notifications
      await onDeviceConnected(server, device);

    } catch (err) {
      if (err instanceof Error && err.name === 'NotFoundError') {
        logger.debug('ℹ️ User cancelled Bluetooth device selection');
        setError(null);
      } else {
        console.error('❌ Error requesting device:', err);
        setError(err instanceof Error ? err.message : 'Failed to connect to device');
      }
      setIsConnecting(false);
    }
  }, [updateSensorId, onDeviceConnected, onDeviceDisconnected]);

  // Disconnect from the current device
  const disconnect = useCallback(async () => {
    const adapter = adapterRef.current;
    if (!adapter) {
      setIsConnected(false);
      setDeviceInfo(null);
      setCurrentData(null);
      return;
    }

    const success = await adapter.disconnect();
    if (success) {
      setIsConnected(false);
      setDeviceInfo(null);
      setCurrentData(null);
      rollingBufferService.clear();
      logger.debug(`🔌 ${adapter.name} disconnected`);
    } else {
      setError('Cannot disconnect while recording is active. Stop recording first.');
      setTimeout(() => setError(null), 3000);
    }
  }, []);

  // Check for existing connection on mount
  useEffect(() => {
    const checkExistingConnection = async () => {
      if (adapterRef.current && serverRef.current?.connected) {
        setIsConnected(true);
        const reading = adapterRef.current.getLiveReading();
        if (reading) {
          setDeviceInfo({
            name: adapterRef.current.name,
            battery: reading.battery,
            charging: reading.charging
          });
        }
      }
    };

    const idleCallback = window.requestIdleCallback || ((cb: () => void) => setTimeout(cb, 0));
    idleCallback(() => checkExistingConnection());
  }, []);

  return {
    // State
    activeSensorId,
    isConnected,
    isConnecting,
    currentData,
    error,
    deviceInfo,
    
    // Actions
    requestDevice,           // Universal scan - auto-detects sensor type
    requestSpecificSensor,   // Explicit sensor selection
    disconnect,
    
    // Adapter info
    adapterName: adapterRef.current?.name || null,
  };
}
