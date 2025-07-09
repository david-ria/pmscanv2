import { useState, useCallback, useRef, useEffect } from 'react';
import { AirBeamData, AirBeamDevice } from '@/lib/airbeam/types';
import { parseAirBeamDataPayload, parseSimpleAirBeamData } from '@/lib/airbeam/dataParser';
import { exponentialBackoff } from '@/lib/pmscan/utils';
import { AirBeamConnectionManager } from '@/lib/airbeam/connectionManager';

// Global connection manager instance
let globalAirBeamConnectionManager: AirBeamConnectionManager | null = null;

function getGlobalAirBeamConnectionManager(): AirBeamConnectionManager {
  if (!globalAirBeamConnectionManager) {
    globalAirBeamConnectionManager = new AirBeamConnectionManager();
  }
  return globalAirBeamConnectionManager;
}

export function useAirBeamBluetooth() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [device, setDevice] = useState<AirBeamDevice | null>(null);
  const [currentData, setCurrentData] = useState<AirBeamData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Use global connection manager to persist across component unmounts
  const connectionManager = getGlobalAirBeamConnectionManager();

  // Event handlers
  const handleDataReceived = useCallback((event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    if (target.value) {
      // Convert ArrayBuffer to string for AirBeam text-based protocol
      const decoder = new TextDecoder();
      const dataString = decoder.decode(target.value);
      
      console.log('📡 Raw AirBeam data received:', dataString);
      console.log('📡 Raw data length:', dataString.length);
      console.log('📡 Raw data bytes:', Array.from(new Uint8Array(target.value.buffer)).map(b => b.toString(16)).join(' '));
      
      // Try parsing with full AirBeam format first
      let data = parseAirBeamDataPayload(dataString, connectionManager.state);
      console.log('🔍 Parsed AirBeam data (full format):', data);
      
      // Fallback to simple format
      if (!data) {
        data = parseSimpleAirBeamData(dataString);
        console.log('🔍 Parsed AirBeam data (simple format):', data);
      }
      
      if (data) {
        // Only update if data is significantly different to avoid duplicates
        setCurrentData(prevData => {
          const isDifferent = !prevData || 
            Math.abs(prevData.pm25 - data!.pm25) >= 0.1 || 
            Math.abs(prevData.pm1 - data!.pm1) >= 0.1 || 
            Math.abs(prevData.pm10 - data!.pm10) >= 0.1 ||
            (data!.timestamp.getTime() - prevData.timestamp.getTime()) >= 1000; // 1 second minimum
          
          if (isDifferent) {
            console.log('🔄 AirBeam data received:', data);
            return data!;
          }
          return prevData;
        });
      }
    }
  }, []);

  const onDeviceConnected = useCallback(async (server: BluetoothRemoteGATTServer) => {
    try {
      const manager = connectionManager;
      const deviceInfo = await manager.initializeDevice(handleDataReceived);
      
      setDevice(deviceInfo);
      setIsConnected(true);
      setIsConnecting(false);
      setError(null);
    } catch (error) {
      console.error('❌ Error initializing AirBeam device:', error);
      setError('Failed to initialize AirBeam device');
      setIsConnecting(false);
    }
  }, [handleDataReceived]);

  const onDeviceDisconnected = useCallback(() => {
    connectionManager.onDisconnected();
    setIsConnected(false);
    setDevice(prev => prev ? { ...prev, connected: false } : null);
  }, []);

  const connect = useCallback(() => {
    const manager = connectionManager;
    console.log('🔄 AirBeam connect() called, shouldConnect:', manager.shouldAutoConnect());
    
    if (!manager.shouldAutoConnect()) return;
    
    exponentialBackoff(
      10,
      1.2,
      () => manager.connect(),
      (server) => onDeviceConnected(server),
      () => {
        console.log('❌ Failed to reconnect AirBeam.');
        setError('Failed to reconnect AirBeam device');
        setIsConnecting(false);
      }
    );
  }, [onDeviceConnected]);

  const requestDevice = useCallback(async () => {
    try {
      setError(null);
      setIsConnecting(true);
      
      const manager = connectionManager;
      const device = await manager.requestDevice();
      
      device.addEventListener('gattserverdisconnected', () => {
        console.log('🔌 AirBeam Device disconnected');
        onDeviceDisconnected();
        connect();
      });
      
      connect();
    } catch (error) {
      console.error('❌ Error requesting AirBeam device:', error);
      setError(error instanceof Error ? error.message : 'Failed to connect to AirBeam device');
      setIsConnecting(false);
    }
  }, [connect, onDeviceDisconnected]);

  const disconnect = useCallback(async () => {
    await connectionManager.disconnect();
    setIsConnected(false);
    setDevice(null);
    setCurrentData(null);
  }, []);

  // Check for existing connection on component mount and re-establish event listeners
  useEffect(() => {
    const manager = connectionManager;
    if (manager.isConnected()) {
      setIsConnected(true);
      
      // Re-establish event listeners for the existing connection
      manager.reestablishEventListeners(handleDataReceived).then((deviceInfo) => {
        if (deviceInfo) {
          setDevice(deviceInfo);
          console.log('🔄 Restored existing AirBeam connection with event listeners');
        }
      }).catch(error => {
        console.error('❌ Failed to restore AirBeam connection:', error);
        setError('Failed to restore AirBeam connection');
      });
    }
  }, [handleDataReceived]);

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