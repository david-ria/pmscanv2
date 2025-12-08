import { useState, useCallback, useEffect, useRef } from 'react';
import { SensorReadingData, ISensorAdapter } from '@/types/sensor';
import { rollingBufferService } from '@/services/rollingBufferService';
import { recordingService } from '@/services/recordingService';
import * as logger from '@/utils/logger';

export type SensorId = 'pmscan' | 'airbeam' | 'atmotube';

const ACTIVE_SENSOR_KEY = 'activeSensorId';

// Dynamic adapter loader
async function getSensorAdapter(sensorId: SensorId): Promise<ISensorAdapter> {
  switch (sensorId) {
    case 'pmscan': {
      const { PMScanAdapter } = await import('@/lib/pmscan/PMScanAdapter');
      return new PMScanAdapter();
    }
    case 'airbeam': {
      const { AirBeamAdapter } = await import('@/lib/airbeam/AirBeamAdapter');
      return new AirBeamAdapter();
    }
    case 'atmotube': {
      const { AtmotubeAdapter } = await import('@/lib/atmotube/AtmotubeAdapter');
      return new AtmotubeAdapter();
    }
    default:
      throw new Error(`Unknown sensor ID: ${sensorId}`);
  }
}

export function useActiveSensor() {
  // Load saved sensor ID or default to pmscan
  const [activeSensorId, setActiveSensorId] = useState<SensorId>(() => {
    const saved = localStorage.getItem(ACTIVE_SENSOR_KEY);
    return (saved as SensorId) || 'pmscan';
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

  // Save sensor selection to localStorage
  const selectSensor = useCallback((sensorId: SensorId) => {
    localStorage.setItem(ACTIVE_SENSOR_KEY, sensorId);
    setActiveSensorId(sensorId);
    // Clear current connection state when switching sensors
    setCurrentData(null);
    setDeviceInfo(null);
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

  // Request and connect to a Bluetooth device using the active adapter's filters
  const requestDevice = useCallback(async (sensorId?: SensorId) => {
    try {
      setError(null);
      setIsConnecting(true);

      // Use provided sensorId or current activeSensorId
      const targetSensorId = sensorId || activeSensorId;
      
      // Update sensor selection if different
      if (sensorId && sensorId !== activeSensorId) {
        selectSensor(sensorId);
      }

      // Dynamically load the adapter for the selected sensor
      const adapter = await getSensorAdapter(targetSensorId);
      adapterRef.current = adapter;

      logger.debug(`🔍 Requesting ${adapter.name} device...`);

      // Call adapter's requestDevice which uses the correct Bluetooth filters
      const device = await adapter.requestDevice();
      deviceRef.current = device;

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
      console.error('❌ Error requesting device:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect to device');
      setIsConnecting(false);
    }
  }, [activeSensorId, selectSensor, onDeviceConnected, onDeviceDisconnected]);

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
    // On mount, check if we have a stored adapter and it's connected
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
    selectSensor,
    requestDevice,
    disconnect,
    
    // Adapter info
    adapterName: adapterRef.current?.name || null,
  };
}
