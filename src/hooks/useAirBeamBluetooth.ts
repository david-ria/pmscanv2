import { useState, useCallback, useEffect, useRef } from 'react';
import { AirBeamData, AirBeamDevice } from '@/lib/airbeam/types';
import { parseAirBeamMessage } from '@/lib/airbeam/dataParser';
import { exponentialBackoff } from '@/lib/pmscan/utils';
import { globalConnectionManager } from '@/lib/airbeam/globalConnectionManager';
import * as logger from '@/utils/logger';

export function useAirBeamBluetooth() {
  // Always call hooks in the same order
  const [isInitialized, setIsInitialized] = useState(false);
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

  // Simple initialization effect with no dependencies to avoid comparison issues
  useEffect(() => {
    if (!isMountedRef.current || isInitialized) return;
    
    setIsInitialized(true);
    
    // Simple connection check without complex async operations
    if (connectionManager && connectionManager.isConnected()) {
      setIsConnected(true);
    }
  });
  
  // Cleanup effect
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  });

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
