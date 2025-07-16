import { useState, useCallback, useEffect } from 'react';
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

  const connectionManager = globalConnectionManager;

  const handleData = useCallback((event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    if (target.value) {
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
      try {
        const info = await connectionManager.initializeDevice(handleData);
        setDevice(info);
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
      } catch (err) {
        console.error('❌ Error initializing AirBeam:', err);
        setError('Failed to initialize device');
        setIsConnecting(false);
      }
    },
    [handleData]
  );

  const onDeviceDisconnected = useCallback(() => {
    connectionManager.onDisconnected();
    setIsConnected(false);
    setDevice((prev) => (prev ? { ...prev, connected: false } : null));
  }, []);

  const connect = useCallback(() => {
    if (!connectionManager.shouldAutoConnect()) return;

    exponentialBackoff(
      10,
      1.2,
      () => connectionManager.connect(),
      (server) => onDeviceConnected(server),
      () => {
        logger.debug('❌ Failed to reconnect.');
        setError('Failed to reconnect');
        setIsConnecting(false);
      }
    );
  }, [onDeviceConnected]);

  const requestDevice = useCallback(async () => {
    try {
      setError(null);
      setIsConnecting(true);

      const dev = await connectionManager.requestDevice();
      dev.addEventListener('gattserverdisconnected', () => {
        logger.debug('🔌 AirBeam Device disconnected');
        onDeviceDisconnected();
        connect();
      });

      connect();
    } catch (err) {
      console.error('❌ Error requesting AirBeam device:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to connect to device'
      );
      setIsConnecting(false);
    }
  }, [connect, onDeviceDisconnected]);

  const disconnect = useCallback(async () => {
    await connectionManager.disconnect();
    setIsConnected(false);
    setDevice(null);
    setCurrentData(null);
  }, []);

  useEffect(() => {
    if (!connectionManager) return;
    
    if (connectionManager.isConnected()) {
      setIsConnected(true);
      connectionManager
        .reestablishEventListeners(handleData)
        .then((deviceInfo) => {
          if (deviceInfo) {
            setDevice(deviceInfo);
            logger.debug('🔄 Restored existing AirBeam connection');
          }
        })
        .catch((err) => {
          console.error('❌ Failed to restore connection:', err);
          setError('Failed to restore connection');
        });
    } else {
      setIsConnected(false);
      setDevice(null);
      setCurrentData(null);
    }
  }, [handleData]);

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
