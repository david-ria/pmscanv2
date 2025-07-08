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

  // Match working version variable names exactly
  const PMScanDeviceRef = useRef<BluetoothDevice | null>(null);
  const PMScanServerRef = useRef<BluetoothRemoteGATTServer | null>(null);
  const PMScanServiceRef = useRef<BluetoothRemoteGATTService | null>(null);
  const PMScanInitedRef = useRef(false);
  const PMScanShouldConnectRef = useRef(false);

  const PMScanObjRef = useRef({
    name: "PMScanXXXXXX",
    version: 0,
    mode: 0,
    interval: 0,
    display: new Uint8Array(10),
    battery: 0,
    charging: 0,
    dataLogger: false,
    externalMemory: 0,
  });

  // Add connection state update function like working version
  const updateConnectionState = useCallback(() => {
    const actuallyConnected = PMScanDeviceRef.current?.gatt?.connected || false;
    const shouldConnect = PMScanShouldConnectRef.current;
    const isInited = PMScanInitedRef.current;
    
    console.log('🔄 Connection state check:', {
      actuallyConnected,
      shouldConnect,
      isInited,
      currentUIState: isConnected
    });
    
    // Update UI state to match actual connection
    setIsConnected(actuallyConnected && isInited);
    setDevice(prev => prev ? { ...prev, connected: actuallyConnected && isInited } : null);
  }, [isConnected]);


  const parsePMScanDataPayload = useCallback((charValue: DataView): PMScanData => {
    const rawData = new Uint8Array(charValue.buffer);
    const ts2000 = ((rawData[3] & 0xFF) << 24) | ((rawData[2] & 0xFF) << 16) | ((rawData[1] & 0xFF) << 8) | (rawData[0] & 0xFF);
    
    const data = {
      pm1: (((rawData[9] & 0xFF) << 8) | (rawData[8] & 0xFF)) / 10,
      pm25: (((rawData[11] & 0xFF) << 8) | (rawData[10] & 0xFF)) / 10,
      pm10: (((rawData[13] & 0xFF) << 8) | (rawData[12] & 0xFF)) / 10,
      temp: (((rawData[15] & 0xFF) << 8) | (rawData[14] & 0xFF)) / 10,
      humidity: (((rawData[17] & 0xFF) << 8) | (rawData[16] & 0xFF)) / 10,
      battery: PMScanObjRef.current.battery,
      charging: PMScanObjRef.current.charging === 1,
      timestamp: new Date((ts2000 + dt2000) * 1000),
      location: "PMScan Device"
    };
    
    console.log('📊 PMScan Data - PM2.5:', data.pm25, 'PM1:', data.pm1, 'PM10:', data.pm10, 'Temp:', data.temp, 'Humidity:', data.humidity);
    return data;
  }, []);

  // Exact copy of working version handlers
  const PMScanRTDataHandler = useCallback((event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    if (target.value) {
      const data = parsePMScanDataPayload(target.value);
      console.log('🔄 RT Data received:', data);
      setCurrentData(data);
    }
  }, [parsePMScanDataPayload]);

  const PMScanIMDataHandler = useCallback((event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    if (target.value) {
      const data = parsePMScanDataPayload(target.value);
      console.log('🔄 IM Data received:', data);
      setCurrentData(data);
    }
  }, [parsePMScanDataPayload]);

  const PMScanBatteryDataHandler = useCallback((event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    if (target.value) {
      const batteryLevel = target.value.getUint8(0);
      console.log(`🔋 Battery event: ${batteryLevel}%`);
      PMScanObjRef.current.battery = batteryLevel;
      setDevice(prev => prev ? { ...prev, battery: batteryLevel } : null);
    }
  }, []);

  const PMScanChargingDataHandler = useCallback((event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    if (target.value) {
      const chargingStatus = target.value.getUint8(0);
      console.log(`⚡ Charging event: ${chargingStatus}`);
      PMScanObjRef.current.charging = chargingStatus;
      setDevice(prev => prev ? { ...prev, charging: chargingStatus === 1 } : null);
    }
  }, []);

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
        console.log(`🔄 Retrying in ${delay}s... (${max} tries left)`);
        setTimeout(() => {
          exponentialBackoff(--max, Math.floor(5 + delay), toTry, success, fail);
        }, delay * 1000);
      });
  }, []);

  const onPMScanConnected = useCallback(async (server: BluetoothRemoteGATTServer) => {
    try {
      console.log('✅ PMScan Device Connected');
      PMScanServerRef.current = server;
      PMScanInitedRef.current = false;
      console.log('🔍 Discovering services...');
      
      const service = await server.getPrimaryService(PMScanServiceUUID);
      PMScanServiceRef.current = service;

      // Read battery level
      const batteryChar = await service.getCharacteristic(PMScanBatteryUUID);
      const batteryValue = await batteryChar.readValue();
      const battery = batteryValue.getUint8(0);
      console.log(`🔋 Battery: ${battery}%`);
      PMScanObjRef.current.battery = battery;

      // Start RT data notifications
      const rtDataChar = await service.getCharacteristic(PMScanRTDataUUID);
      await rtDataChar.startNotifications();
      rtDataChar.addEventListener('characteristicvaluechanged', PMScanRTDataHandler);

      // Start IM data notifications
      const imDataChar = await service.getCharacteristic(PMScanIMDataUUID);
      await imDataChar.startNotifications();
      imDataChar.addEventListener('characteristicvaluechanged', PMScanIMDataHandler);

      // Start battery notifications
      await batteryChar.startNotifications();
      batteryChar.addEventListener('characteristicvaluechanged', PMScanBatteryDataHandler);

      // Start charging notifications
      const chargingChar = await service.getCharacteristic(PMScanChargingUUID);
      await chargingChar.startNotifications();
      chargingChar.addEventListener('characteristicvaluechanged', PMScanChargingDataHandler);

      // Read and sync time if needed
      const timeChar = await service.getCharacteristic(PMScanTimeUUID);
      const timeValue = await timeChar.readValue();
      const deviceTime = timeValue.getUint32(0);
      console.log(`⏰ Time is ${deviceTime}`);
      
      if (deviceTime === 0) {
        console.log('⏰ Time not sync, writing current time...');
        const timeDt2000 = Math.floor((new Date().getTime() / 1000) - dt2000);
        const time = new Uint8Array(4);
        time[0] = timeDt2000 & 0xFF;
        time[1] = (timeDt2000 >> 8) & 0xFF;
        time[2] = (timeDt2000 >> 16) & 0xFF;
        time[3] = (timeDt2000 >> 24) & 0xFF;
        await timeChar.writeValueWithResponse(time);
      } else {
        console.log('⏰ Time already sync');
      }

      // Read charging status
      const chargingValue = await chargingChar.readValue();
      const charging = chargingValue.getUint8(0);
      console.log(`⚡ Charging: ${charging}`);
      PMScanObjRef.current.charging = charging;

      // Read version
      const versionChar = await service.getCharacteristic(PMScanOTHUUID);
      const versionValue = await versionChar.readValue();
      const version = versionValue.getUint8(0) >> 2;
      console.log(`📋 Version: ${version}`);
      PMScanObjRef.current.version = version;

      // Read interval
      const intervalChar = await service.getCharacteristic(PMScanIntervalUUID);
      const intervalValue = await intervalChar.readValue();
      const interval = intervalValue.getUint8(0);
      console.log(`⏱️ Interval: ${interval}`);
      PMScanObjRef.current.interval = interval;

      // Read mode
      const modeChar = await service.getCharacteristic(PMScanModeUUID);
      const modeValue = await modeChar.readValue();
      const mode = modeValue.getUint8(0);
      console.log(`⚙️ Mode: ${mode}`);
      PMScanObjRef.current.mode = mode;

      // Read display settings
      const displayChar = await service.getCharacteristic(PMScanDisplayUUID);
      const displayValue = await displayChar.readValue();
      console.log(`🖥️ Display: ${displayValue.getUint8(0)}`);
      PMScanObjRef.current.display = new Uint8Array(displayValue.buffer);

      PMScanInitedRef.current = true;
      setDevice({
        name: PMScanDeviceRef.current?.name || "PMScan Device",
        version,
        mode,
        interval,
        battery,
        charging: charging === 1,
        connected: true
      });
      setIsConnected(true);
      setError(null);
      console.log('🎉 Init finished');
      
      // Call updateConnectionState to ensure UI reflects actual state
      updateConnectionState();
    } catch (error) {
      console.error('❌ Error initializing device:', error);
      setError('Failed to initialize device');
    }
  }, [PMScanRTDataHandler, PMScanIMDataHandler, PMScanBatteryDataHandler, PMScanChargingDataHandler, updateConnectionState]);

  const onPMScanDisconnected = useCallback(() => {
    console.log('🔌 PMScan Device disconnected');
    PMScanInitedRef.current = false;
    setIsConnected(false);
    setDevice(prev => prev ? { ...prev, connected: false } : null);
  }, []);

  const connect = useCallback(() => {
    console.log('🔄 connect() called, shouldConnect:', PMScanShouldConnectRef.current);
    if (!PMScanShouldConnectRef.current) return;
    
    exponentialBackoff(
      10,
      1.2,
      () => {
        console.log('🔌 Connecting to Bluetooth Device...');
        return PMScanDeviceRef.current!.gatt!.connect();
      },
      (server) => {
        onPMScanConnected(server);
      },
      () => {
        console.log('❌ Failed to reconnect.');
        setError('Failed to reconnect');
      }
    );
  }, [exponentialBackoff, onPMScanConnected]);

  const requestDevice = useCallback(async () => {
    try {
      setError(null);
      
      if (!navigator.bluetooth) {
        throw new Error('Bluetooth not available in this browser');
      }

      console.log('🔍 Requesting any Bluetooth device...');
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: "PMScan" }],
        optionalServices: [PMScanServiceUUID]
      });

      console.log('📱 Requested ' + device.name);
      PMScanDeviceRef.current = device;
      PMScanInitedRef.current = false;
      PMScanShouldConnectRef.current = true;
      
      device.addEventListener('gattserverdisconnected', () => {
        console.log('🔌 PMScan Device disconnected');
        PMScanInitedRef.current = false;
        // Update UI to reflect actual connection state
        updateConnectionState();
        // Auto-reconnect if we should
        connect();
      });
      
      connect();
    } catch (error) {
      console.error('❌ Error requesting device:', error);
      setError(error instanceof Error ? error.message : 'Failed to connect to device');
    }
  }, [connect, updateConnectionState]);

  const disconnect = useCallback(async () => {
    PMScanShouldConnectRef.current = false;
    
    if (PMScanDeviceRef.current?.gatt?.connected && PMScanServiceRef.current) {
      try {
        console.log('🔌 Requesting disconnect...');
        const modeChar = await PMScanServiceRef.current.getCharacteristic(PMScanModeUUID);
        const modeToWrite = new Uint8Array(1);
        modeToWrite[0] = PMScanObjRef.current.mode | 0x40;
        await modeChar.writeValueWithResponse(modeToWrite);
        PMScanDeviceRef.current.gatt.disconnect();
      } catch (err) {
        console.error('❌ Failed to send disconnect command:', err);
      }
    }
    
    setIsConnected(false);
    setDevice(null);
    setCurrentData(null);
  }, []);

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