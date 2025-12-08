// src/hooks/useCapacitorBluetooth.ts
// Hook React pour utiliser le service Bluetooth Capacitor

import { useState, useCallback, useEffect } from 'react';
import { capacitorBluetoothService, DiscoveredDevice } from '@/services/capacitorBluetoothService';
import * as logger from '@/utils/logger';

export interface UseCapacitorBluetoothReturn {
  // État
  isScanning: boolean;
  isInitialized: boolean;
  discoveredDevices: DiscoveredDevice[];
  error: string | null;
  isNative: boolean;
  
  // Actions
  startScan: () => Promise<void>;
  stopScan: () => Promise<void>;
  connect: (deviceId: string) => Promise<void>;
  initialize: () => Promise<boolean>;
}

/**
 * Hook pour gérer le scan Bluetooth Capacitor sur mobile natif
 * Utilise un scan large (sans filtres UUID) avec filtrage logiciel par nom
 */
export function useCapacitorBluetooth(): UseCapacitorBluetoothReturn {
  const [isScanning, setIsScanning] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<DiscoveredDevice[]>([]);
  const [error, setError] = useState<string | null>(null);

  const isNative = capacitorBluetoothService.isNativePlatform();

  /**
   * Initialise le Bluetooth et demande les permissions
   */
  const initialize = useCallback(async (): Promise<boolean> => {
    if (!isNative) {
      logger.debug('📱 Not a native platform, Capacitor Bluetooth not available');
      return false;
    }

    setError(null);
    
    try {
      const success = await capacitorBluetoothService.initialize();
      setIsInitialized(success);
      
      if (!success) {
        setError('Bluetooth initialization failed. Please enable Bluetooth.');
      }
      
      return success;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Bluetooth initialization failed';
      setError(message);
      logger.error('❌ Bluetooth init error:', err);
      return false;
    }
  }, [isNative]);

  /**
   * Démarre le scan large avec filtrage par nom
   */
  const startScan = useCallback(async () => {
    if (!isNative) {
      setError('Capacitor Bluetooth only available on native platforms');
      return;
    }

    setError(null);
    setDiscoveredDevices([]);
    setIsScanning(true);

    try {
      await capacitorBluetoothService.startScan((devices) => {
        setDiscoveredDevices(devices);
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Scan failed';
      setError(message);
      setIsScanning(false);
      logger.error('❌ Scan error:', err);
    }
  }, [isNative]);

  /**
   * Arrête le scan
   */
  const stopScan = useCallback(async () => {
    await capacitorBluetoothService.stopScan();
    setIsScanning(false);
  }, []);

  /**
   * Connecte à un appareil
   */
  const connect = useCallback(async (deviceId: string) => {
    setError(null);
    
    try {
      // Arrêter le scan avant de connecter
      await stopScan();
      
      await capacitorBluetoothService.connect(deviceId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection failed';
      setError(message);
      throw err;
    }
  }, [stopScan]);

  // Cleanup: arrêter le scan au démontage
  useEffect(() => {
    return () => {
      if (capacitorBluetoothService.scanning) {
        capacitorBluetoothService.stopScan();
      }
    };
  }, []);

  return {
    isScanning,
    isInitialized,
    discoveredDevices,
    error,
    isNative,
    startScan,
    stopScan,
    connect,
    initialize
  };
}
