import { useState, useCallback, useEffect, useRef } from 'react';
import { AirBeamData, AirBeamDevice } from '@/lib/airbeam/types';
import { parseAirBeamMessage } from '@/lib/airbeam/dataParser';
import { exponentialBackoff } from '@/lib/pmscan/utils';
import { globalConnectionManager } from '@/lib/airbeam/globalConnectionManager';
import * as logger from '@/utils/logger';

export function useAirBeamBluetooth() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [device, setDevice] = useState<AirBeamDevice | null>(null);
  const [currentData, setCurrentData] = useState<AirBeamData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  const connectionManager = globalConnectionManager;

  const handleData = useCallback((event: Event) => {
    if (!isMountedRef.current) return;
    
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    if (target?.value) {
      const textDecoder = new TextDecoder();
      const message = textDecoder.decode(target.value.buffer);
      const parsed = parseAirBeamMessage(message);
      if (Object.keys(parsed).length > 0) {
        setCurrentData((prev) => ({
          ...(prev ?? ({} as AirBeamData)),
          ...parsed,
        }));
      }
    }
  }, []);

  const onDeviceConnected = useCallback(
    async (server: BluetoothRemoteGATTServer) => {
      if (!isMountedRef.current) return;
      
      try {
        const info = await connectionManager.initializeDevice(handleData);
        if (!isMountedRef.current) return;
        
        setDevice(info);
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
      } catch (err) {
        if (!isMountedRef.current) return;
        console.error('❌ Error initializing AirBeam:', err);
        setError('Failed to initialize device');
        setIsConnecting(false);
      }
    },
    [handleData]
  );

  const onDeviceDisconnected = useCallback(() => {
    if (!isMountedRef.current) return;
    connectionManager.onDisconnected();
    setIsConnected(false);
    setDevice((prev) => (prev ? { ...prev, connected: false } : null));
  }, []);

  const connect = useCallback(() => {
    if (!isMountedRef.current || !connectionManager.shouldAutoConnect()) return;

    exponentialBackoff(
      10,
      1.2,
      () => connectionManager.connect(),
      (server) => onDeviceConnected(server),
      () => {
        if (!isMountedRef.current) return;
        logger.debug('❌ Failed to reconnect.');
        setError('Failed to reconnect');
        setIsConnecting(false);
      }
    );
  }, [onDeviceConnected]);

  const requestDevice = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    try {
      setError(null);
      setIsConnecting(true);

      const dev = await connectionManager.requestDevice();
      if (!isMountedRef.current) return;
      
      dev.addEventListener('gattserverdisconnected', () => {
        logger.debug('🔌 AirBeam Device disconnected');
        onDeviceDisconnected();
        connect();
      });

      connect();
    } catch (err) {
      if (!isMountedRef.current) return;
      console.error('❌ Error requesting AirBeam device:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to connect to device'
      );
      setIsConnecting(false);
    }
  }, [connect, onDeviceDisconnected]);

  const disconnect = useCallback(async () => {
    if (!isMountedRef.current) return;
    await connectionManager.disconnect();
    setIsConnected(false);
    setDevice(null);
    setCurrentData(null);
  }, []);

  // Initialize connection status on mount
  useEffect(() => {
    if (!connectionManager || !isMountedRef.current) return;
    
    const checkConnection = async () => {
      try {
        if (connectionManager.isConnected()) {
          if (!isMountedRef.current) return;
          setIsConnected(true);
          
          const deviceInfo = await connectionManager.reestablishEventListeners(handleData);
          if (!isMountedRef.current) return;
          
          if (deviceInfo) {
            setDevice(deviceInfo);
            logger.debug('🔄 Restored existing AirBeam connection');
          }
        } else {
          if (!isMountedRef.current) return;
          setIsConnected(false);
          setDevice(null);
          setCurrentData(null);
        }
      } catch (err) {
        if (!isMountedRef.current) return;
        console.error('❌ Failed to restore connection:', err);
        setError('Failed to restore connection');
      }
    };
    
    checkConnection();
  }, []); // Completely empty dependency array
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    isConnected,
    isConnecting,
    device,
    currentData,
    error,
    requestDevice,
    disconnect,
  };
}
