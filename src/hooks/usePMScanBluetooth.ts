import { useState, useCallback, useRef } from 'react';

// PMScan Bluetooth Service UUIDs
const PMScanServiceUUID = "f3641900-00b0-4240-ba50-05ca45bf8abc";
const PMScanRTDataUUID = "f3641901-00b0-4240-ba50-05ca45bf8abc";
const PMScanIMDataUUID = "f3641902-00b0-4240-ba50-05ca45bf8abc";
const PMScanOTHUUID = "f3641903-00b0-4240-ba50-05ca45bf8abc";
const PMScanBatteryUUID = "f3641904-00b0-4240-ba50-05ca45bf8abc";
const PMScanChargingUUID = "f3641905-00b0-4240-ba50-05ca45bf8abc";
const PMScanTimeUUID = "f3641906-00b0-4240-ba50-05ca45bf8abc";
const PMScanIntervalUUID = "f3641907-00b0-4240-ba50-05ca45bf8abc";
const PMScanModeUUID = "f3641908-00b0-4240-ba50-05ca45bf8abc";
const PMScanDisplayUUID = "f364190a-00b0-4240-ba50-05ca45bf8abc";

const dt2000 = 946684800;

export interface PMScanData {
  pm1: number;
  pm25: number;
  pm10: number;
  temp: number;
  humidity: number;
  battery: number;
  charging: boolean;
  timestamp: Date;
  location?: string;
}

export interface PMScanDevice {
  name: string;
  version: number;
  mode: number;
  interval: number;
  battery: number;
  charging: boolean;
  connected: boolean;
}

export function usePMScanBluetooth() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [device, setDevice] = useState<PMScanDevice | null>(null);
  const [currentData, setCurrentData] = useState<PMScanData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const deviceRef = useRef<BluetoothDevice | null>(null);
  const serviceRef = useRef<BluetoothRemoteGATTService | null>(null);
  const shouldConnectRef = useRef(false);

  const parsePMScanDataPayload = useCallback((charValue: DataView): PMScanData => {
    const rawData = new Uint8Array(charValue.buffer);
    const ts2000 = ((rawData[3] & 0xFF) << 24) | ((rawData[2] & 0xFF) << 16) | ((rawData[1] & 0xFF) << 8) | (rawData[0] & 0xFF);
    
    const data = {
      pm1: (((rawData[9] & 0xFF) << 8) | (rawData[8] & 0xFF)) / 10,
      pm25: (((rawData[11] & 0xFF) << 8) | (rawData[10] & 0xFF)) / 10,
      pm10: (((rawData[13] & 0xFF) << 8) | (rawData[12] & 0xFF)) / 10,
      temp: (((rawData[15] & 0xFF) << 8) | (rawData[14] & 0xFF)) / 10,
      humidity: (((rawData[17] & 0xFF) << 8) | (rawData[16] & 0xFF)) / 10,
      battery: device?.battery || 0,
      charging: device?.charging || false,
      timestamp: new Date((ts2000 + dt2000) * 1000),
      location: "PMScan Device"
    };
    
    console.log('PMScan Data Received:', data);
    return data;
  }, [device]);

  const handleRTData = useCallback((event: Event) => {
    console.log('handleRTData called');
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    if (target.value) {
      console.log('Raw characteristic value received, buffer length:', target.value.byteLength);
      try {
        const data = parsePMScanDataPayload(target.value);
        console.log('Parsed PM data - PM2.5:', data.pm25, 'PM1:', data.pm1, 'PM10:', data.pm10);
        setCurrentData(data);
      } catch (error) {
        console.error('Error parsing PMScan data:', error);
      }
    } else {
      console.log('No value in characteristic');
    }
  }, [parsePMScanDataPayload]);

  const handleBatteryData = useCallback((event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    if (target.value && device) {
      const batteryLevel = target.value.getUint8(0);
      setDevice(prev => prev ? { ...prev, battery: batteryLevel } : null);
    }
  }, [device]);

  const handleChargingData = useCallback((event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    if (target.value && device) {
      const chargingStatus = target.value.getUint8(0) === 1;
      setDevice(prev => prev ? { ...prev, charging: chargingStatus } : null);
    }
  }, [device]);

  const exponentialBackoff = useCallback((
    max: number,
    delay: number,
    toTry: () => Promise<any>,
    success: (result: any) => void,
    fail: () => void
  ) => {
    toTry()
      .then(result => success(result))
      .catch(_ => {
        if (max === 0) {
          return fail();
        }
        setTimeout(() => {
          exponentialBackoff(--max, Math.floor(5 + delay), toTry, success, fail);
        }, delay * 1000);
      });
  }, []);

  const initializeDevice = useCallback(async (server: BluetoothRemoteGATTServer) => {
    try {
      const service = await server.getPrimaryService(PMScanServiceUUID);
      serviceRef.current = service;

      // Read initial battery level
      const batteryChar = await service.getCharacteristic(PMScanBatteryUUID);
      const batteryValue = await batteryChar.readValue();
      const battery = batteryValue.getUint8(0);

      // Read charging status
      const chargingChar = await service.getCharacteristic(PMScanChargingUUID);
      const chargingValue = await chargingChar.readValue();
      const charging = chargingValue.getUint8(0) === 1;

      // Read device info
      const versionChar = await service.getCharacteristic(PMScanOTHUUID);
      const versionValue = await versionChar.readValue();
      const version = versionValue.getUint8(0) >> 2;

      // Set up real-time data notifications
      const rtDataChar = await service.getCharacteristic(PMScanRTDataUUID);
      await rtDataChar.startNotifications();
      rtDataChar.addEventListener('characteristicvaluechanged', handleRTData);

      // Set up immediate data notifications
      const imDataChar = await service.getCharacteristic(PMScanIMDataUUID);
      await imDataChar.startNotifications();
      imDataChar.addEventListener('characteristicvaluechanged', handleRTData);

      // Set up battery notifications
      await batteryChar.startNotifications();
      batteryChar.addEventListener('characteristicvaluechanged', handleBatteryData);

      // Set up charging notifications
      await chargingChar.startNotifications();
      chargingChar.addEventListener('characteristicvaluechanged', handleChargingData);

      // Sync time if needed
      const timeChar = await service.getCharacteristic(PMScanTimeUUID);
      const timeValue = await timeChar.readValue();
      const deviceTime = timeValue.getUint32(0);
      
      if (deviceTime === 0) {
        const timeDt2000 = Math.floor((new Date().getTime() / 1000) - dt2000);
        const time = new Uint8Array(4);
        time[0] = timeDt2000 & 0xFF;
        time[1] = (timeDt2000 >> 8) & 0xFF;
        time[2] = (timeDt2000 >> 16) & 0xFF;
        time[3] = (timeDt2000 >> 24) & 0xFF;
        await timeChar.writeValueWithResponse(time);
      }

      setDevice({
        name: deviceRef.current?.name || "PMScan Device",
        version,
        mode: 0,
        interval: 0,
        battery,
        charging,
        connected: true
      });

      setIsConnected(true);
      setError(null);
    } catch (err) {
      console.error('Failed to initialize device:', err);
      setError('Failed to initialize device');
      throw err;
    }
  }, [handleRTData, handleBatteryData, handleChargingData]);

  const connectToDevice = useCallback(() => {
    if (!deviceRef.current || isConnecting) return;

    setIsConnecting(true);
    shouldConnectRef.current = true;

    exponentialBackoff(
      10,
      1.2,
      () => deviceRef.current!.gatt!.connect(),
      (server) => {
        initializeDevice(server).finally(() => setIsConnecting(false));
      },
      () => {
        setError('Failed to connect to device');
        setIsConnecting(false);
      }
    );
  }, [isConnecting, exponentialBackoff, initializeDevice]);

  const requestDevice = useCallback(async () => {
    try {
      setError(null);
      
      if (!navigator.bluetooth) {
        throw new Error('Bluetooth not available in this browser');
      }

      const device = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: "PMScan" }],
        optionalServices: [PMScanServiceUUID]
      });

      deviceRef.current = device;
      
      device.addEventListener('gattserverdisconnected', () => {
        setIsConnected(false);
        setDevice(prev => prev ? { ...prev, connected: false } : null);
        
        if (shouldConnectRef.current) {
          connectToDevice();
        }
      });

      connectToDevice();
    } catch (err) {
      console.error('Failed to request device:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect to device');
    }
  }, [connectToDevice]);

  const disconnect = useCallback(async () => {
    shouldConnectRef.current = false;
    
    if (deviceRef.current?.gatt?.connected && serviceRef.current) {
      try {
        const modeChar = await serviceRef.current.getCharacteristic(PMScanModeUUID);
        const currentMode = device?.mode || 0;
        const modeToWrite = new Uint8Array(1);
        modeToWrite[0] = currentMode | 0x40;
        await modeChar.writeValueWithResponse(modeToWrite);
      } catch (err) {
        console.error('Failed to send disconnect command:', err);
      }
      
      deviceRef.current.gatt.disconnect();
    }
    
    setIsConnected(false);
    setDevice(null);
    setCurrentData(null);
  }, [device?.mode]);

  return {
    isConnected,
    isConnecting,
    device,
    currentData,
    error,
    requestDevice,
    disconnect
  };
}