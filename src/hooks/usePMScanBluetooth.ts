import { useState, useCallback, useRef } from 'react';
import { PMScanData, PMScanDevice } from '@/lib/pmscan/types';
import { PMScanConnectionManager } from '@/lib/pmscan/connectionManager';
import { parsePMScanDataPayload } from '@/lib/pmscan/dataParser';
import { exponentialBackoff } from '@/lib/pmscan/utils';

export function usePMScanBluetooth() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [device, setDevice] = useState<PMScanDevice | null>(null);
  const [currentData, setCurrentData] = useState<PMScanData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connectionManagerRef = useRef(new PMScanConnectionManager());

  // Connection state update function - removed to prevent interference

  // Event handlers
  const handleRTData = useCallback((event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    if (target.value) {
      const data = parsePMScanDataPayload(target.value, connectionManagerRef.current.state);
      console.log('🔄 RT Data received:', data);
      
      // Only update if data is significantly different to avoid duplicates
      setCurrentData(prevData => {
        if (!prevData || 
            Math.abs(prevData.pm25 - data.pm25) > 0.05 || 
            Math.abs(prevData.pm1 - data.pm1) > 0.05 || 
            Math.abs(prevData.pm10 - data.pm10) > 0.05 ||
            data.timestamp.getTime() - prevData.timestamp.getTime() > 500) {
          return data;
        }
        return prevData;
      });
    }
  }, []);

  const handleIMData = useCallback((event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    if (target.value) {
      const data = parsePMScanDataPayload(target.value, connectionManagerRef.current.state);
      console.log('🔄 IM Data received:', data);
      
      // Only update if data is significantly different to avoid duplicates
      setCurrentData(prevData => {
        if (!prevData || 
            Math.abs(prevData.pm25 - data.pm25) > 0.05 || 
            Math.abs(prevData.pm1 - data.pm1) > 0.05 || 
            Math.abs(prevData.pm10 - data.pm10) > 0.05 ||
            data.timestamp.getTime() - prevData.timestamp.getTime() > 500) {
          return data;
        }
        return prevData;
      });
    }
  }, []);

  const handleBatteryData = useCallback((event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    if (target.value) {
      const batteryLevel = target.value.getUint8(0);
      console.log(`🔋 Battery event: ${batteryLevel}%`);
      connectionManagerRef.current.updateBattery(batteryLevel);
      setDevice(prev => prev ? { ...prev, battery: batteryLevel } : null);
    }
  }, []);

  const handleChargingData = useCallback((event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    if (target.value) {
      const chargingStatus = target.value.getUint8(0);
      console.log(`⚡ Charging event: ${chargingStatus}`);
      connectionManagerRef.current.updateCharging(chargingStatus);
      setDevice(prev => prev ? { ...prev, charging: chargingStatus === 1 } : null);
    }
  }, []);

  const onDeviceConnected = useCallback(async (server: BluetoothRemoteGATTServer) => {
    try {
      const manager = connectionManagerRef.current;
      const deviceInfo = await manager.initializeDevice(
        handleRTData,
        handleIMData,
        handleBatteryData,
        handleChargingData
      );
      
      setDevice(deviceInfo);
      setIsConnected(true);
      setIsConnecting(false);
      setError(null);
    } catch (error) {
      console.error('❌ Error initializing device:', error);
      setError('Failed to initialize device');
      setIsConnecting(false);
    }
  }, [handleRTData, handleIMData, handleBatteryData, handleChargingData]);

  const onDeviceDisconnected = useCallback(() => {
    connectionManagerRef.current.onDisconnected();
    setIsConnected(false);
    setDevice(prev => prev ? { ...prev, connected: false } : null);
  }, []);

  const connect = useCallback(() => {
    const manager = connectionManagerRef.current;
    console.log('🔄 connect() called, shouldConnect:', manager.shouldAutoConnect());
    
    if (!manager.shouldAutoConnect()) return;
    
    exponentialBackoff(
      10,
      1.2,
      () => manager.connect(),
      (server) => onDeviceConnected(server),
      () => {
        console.log('❌ Failed to reconnect.');
        setError('Failed to reconnect');
        setIsConnecting(false);
      }
    );
  }, [onDeviceConnected]);

  const requestDevice = useCallback(async () => {
    try {
      setError(null);
      setIsConnecting(true);
      
      const manager = connectionManagerRef.current;
      const device = await manager.requestDevice();
      
      device.addEventListener('gattserverdisconnected', () => {
        console.log('🔌 PMScan Device disconnected');
        onDeviceDisconnected();
        connect();
      });
      
      connect();
    } catch (error) {
      console.error('❌ Error requesting device:', error);
      setError(error instanceof Error ? error.message : 'Failed to connect to device');
      setIsConnecting(false);
    }
  }, [connect, onDeviceDisconnected]);

  const disconnect = useCallback(async () => {
    await connectionManagerRef.current.disconnect();
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