import { useState, useCallback, useRef, useEffect } from 'react';
import { PMScanData, PMScanDevice } from '@/lib/pmscan/types';
import { parsePMScanDataPayload } from '@/lib/pmscan/dataParser';
import { exponentialBackoff } from '@/lib/pmscan/utils';
import { globalConnectionManager } from '@/lib/pmscan/globalConnectionManager';
import { PMScanConnectionUtils } from '@/lib/pmscan/connectionUtils';
import { PMScanDeviceStorage } from '@/lib/pmscan/deviceStorage';
import { FoundDevice } from '@/lib/bleScan';
import { Capacitor } from '@capacitor/core';
import { useToast } from '@/hooks/use-toast';
import * as logger from '@/utils/logger';
import { safeBleDebugger } from '@/lib/bleSafeWrapper';

export function usePMScanBluetooth() {
  const { toast } = useToast();
  const [device, setDevice] = useState<PMScanDevice | null>(null);
  const [currentData, setCurrentData] = useState<PMScanData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDevicePicker, setShowDevicePicker] = useState(false);
  const [filteredDevices, setFilteredDevices] = useState<FoundDevice[]>([]);
  const [rawDevices, setRawDevices] = useState<FoundDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  // Use global connection manager to persist across component unmounts
  const connectionManager = globalConnectionManager;

  // Get connection state from state machine
  const isConnected = connectionManager.isConnected();
  const isConnecting = connectionManager.isConnecting();

  // Event handlers
  const handleRTData = useCallback((event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    if (target.value) {
      // Debug logging for data reception tracking
      logger.rateLimitedDebug(
        'pmbluetooth.rtdata',
        5000, // Rate limit to every 5 seconds
        `📡 RT data notification received: ${target.value.byteLength} bytes`
      );
      const data = parsePMScanDataPayload(
        target.value,
        connectionManager.state
      );

      if (!data) {
        // Invalid packet - skip processing
        return;
      }

      // Only update and log if data is significantly different to avoid duplicates
      setCurrentData((prevData) => {
        const isDifferent =
          !prevData ||
          Math.abs(prevData.pm25 - data.pm25) >= 0.1 ||
          Math.abs(prevData.pm1 - data.pm1) >= 0.1 ||
          Math.abs(prevData.pm10 - data.pm10) >= 0.1 ||
          data.timestamp.getTime() - prevData.timestamp.getTime() >= 1000; // 1 second minimum

        if (isDifferent) {
          console.log('📡 NEW PMScan data received and set as currentData:', {
            pm1: data.pm1,
            pm25: data.pm25, 
            pm10: data.pm10,
            timestamp: data.timestamp.toISOString(),
            previousData: prevData ? {
              pm25: prevData.pm25,
              timestamp: prevData.timestamp.toISOString()
            } : null
          });
          return data;
        }
        // Skip logging and updating if data is too similar
        return prevData;
      });
    }
  }, []);

  const handleIMData = useCallback((event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    if (target.value) {
      const data = parsePMScanDataPayload(
        target.value,
        connectionManager.state
      );

      if (!data) {
        // Invalid packet - skip processing
        return;
      }

      // Skip IM data entirely to avoid duplicates - RT data is sufficient for real-time display
    }
  }, []);

  const handleBatteryData = useCallback((event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    if (target.value) {
      const batteryLevel = target.value.getUint8(0);
      logger.rateLimitedDebug(
        'pmbluetooth.battery',
        60000,
        `🔋 Battery event: ${batteryLevel}%`
      );
      connectionManager.updateBattery(batteryLevel);
      setDevice((prev) => (prev ? { ...prev, battery: batteryLevel } : null));
    }
  }, []);

  const handleChargingData = useCallback((event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    if (target.value) {
      const chargingStatus = target.value.getUint8(0);
      logger.rateLimitedDebug(
        'pmbluetooth.charging',
        60000,
        `⚡ Charging event: ${chargingStatus}`
      );
      connectionManager.updateCharging(chargingStatus);
      setDevice((prev) =>
        prev ? { ...prev, charging: chargingStatus === 1 } : null
      );
    }
  }, []);

  const onDeviceConnected = useCallback(
    async (deviceInfo: PMScanDevice) => {
      setDevice(deviceInfo);
      setError(null);
    },
    []
  );

  const onDeviceDisconnected = useCallback(() => {
    connectionManager.onDisconnected();
    setDevice((prev) => (prev ? { ...prev, connected: false } : null));
  }, []);

  const connect = useCallback(async (deviceInfo?: { deviceId?: string; name?: string }): Promise<boolean> => {
    // Clear any pending connection timeout since connection is starting
    const { ConnectionTimeoutManager } = await import('@/lib/pmscan/connectionTimeoutManager');
    ConnectionTimeoutManager.clearTimeout();
    
    const manager = connectionManager;
    safeBleDebugger.info('CONNECT', '[BLE:CONNECT] connecting', undefined, {
      deviceId: deviceInfo?.deviceId?.slice(-8) || 'unknown',
      deviceName: deviceInfo?.name || 'unknown'
    });
    
    logger.debug('🔄 connect() called - proceeding with user-initiated connection');

      const maxRetries = 3;
      const baseDelay = 1000;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          logger.debug(`🔄 Connection attempt ${attempt + 1}/${maxRetries}`);
          
          const server = await manager.connect();
          safeBleDebugger.info('CONNECT', '[BLE:CONNECT] success', undefined, {});
          
          safeBleDebugger.info('INIT', '[BLE:INIT] services/characteristics', undefined, {});
          const deviceInfo = await manager.initializeDevice(
            handleRTData,
            handleIMData,
            handleBatteryData,
            handleChargingData
          );
          
          safeBleDebugger.info('NOTIFY', '[BLE:NOTIFY] started', undefined, {});
          await onDeviceConnected(deviceInfo);
          logger.debug('✅ PMScan connection successful');
          return true;
        } catch (error: any) {
          const errorMessage = error?.message || 'Unknown connection error';
          logger.error(`❌ Connection attempt ${attempt + 1} failed:`, errorMessage);
          safeBleDebugger.error('CONNECT', `[BLE:CONNECT] error (attempt ${attempt + 1})`, undefined, { error: errorMessage });
          
          // Check if this is a critical notification failure
          if (errorMessage.includes('critical') && errorMessage.includes('notifications')) {
            logger.error('🚨 Critical notification failure - cannot continue');
            
            toast({
              title: "Échec critique de connexion",
              description: 'Les données essentielles de l\'appareil ne sont pas disponibles. Redémarrez l\'appareil.',
              variant: "destructive",
            });
            
            setError(`Device connection failed: Essential data stream unavailable`);
            return false;
          }
          
          if (attempt === maxRetries - 1) {
            // Final attempt failed
            toast({
              title: "Échec de connexion",
              description: errorMessage.includes('timeout') 
                ? 'Délai d\'attente dépassé lors de la connexion'
                : errorMessage.includes('startNotifications')
                ? 'Impossible de configurer les notifications. Redémarrage recommandé.'
                : `Connexion échouée après ${maxRetries} tentatives`,
              variant: "destructive",
            });
            
            setError(`Connection failed after ${maxRetries} attempts: ${errorMessage}`);
            return false;
          }
          
          // Exponential backoff delay
          const delay = baseDelay * Math.pow(2, attempt);
          logger.debug(`⏳ Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

    return false;
  }, [onDeviceConnected, handleRTData, handleIMData, handleBatteryData, handleChargingData]);

  const requestDevice = useCallback(async () => {
    try {
      setError(null);
      safeBleDebugger.info('PICKER', '[BLE:PICKER] requestDevice started', undefined, {});

      const manager = connectionManager;
      const device = await manager.requestDevice();

      safeBleDebugger.info('PICKER', '[BLE:PICKER] requestDevice completed', undefined, { 
        deviceId: (device as any).id?.slice(-8) || 'unknown' 
      });

      // Only add gattserverdisconnected listener for web platform
      if (!Capacitor.isNativePlatform()) {
        device.addEventListener('gattserverdisconnected', () => {
          logger.debug('🔌 PMScan Device disconnected');
          onDeviceDisconnected();
          connect();
        });
      }

      // Start connection process immediately after device selection
      const connectionResult = await connect({
        deviceId: (device as any).id,
        name: device.name
      });
      
      if (connectionResult) {
        safeBleDebugger.info('PICKER', '[BLE:PICKER] connection flow completed successfully', undefined, {
          deviceId: (device as any).id?.slice(-8) || 'unknown'
        });
      } else {
        safeBleDebugger.error('PICKER', '[BLE:PICKER] connection flow failed', undefined, {
          deviceId: (device as any).id?.slice(-8) || 'unknown'
        });
      }
    } catch (error) {
      console.error('❌ Error requesting device:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect to device';
      
      safeBleDebugger.error('PICKER', '[BLE:PICKER] requestDevice failed', undefined, {
        error: errorMessage
      });
      
      // Show user-friendly toast
      toast({
        title: "Échec de la sélection d'appareil",
        description: errorMessage.includes('timeout') 
          ? 'Délai d\'attente dépassé lors de la recherche d\'appareils'
          : errorMessage.includes('No PMScan devices found')
          ? 'Aucun appareil PMScan trouvé. Vérifiez que votre appareil est allumé et à proximité.'
          : errorMessage.includes('user cancelled')
          ? 'Sélection annulée'
          : 'Erreur lors de la sélection de l\'appareil',
        variant: "destructive",
      });
      
      setError(errorMessage);
    }
  }, [connect, onDeviceDisconnected]);

  const disconnect = useCallback(async () => {
    const success = await connectionManager.disconnect();
    if (success) {
      setDevice(null);
      setCurrentData(null);
    } else {
      // Show warning that disconnection was prevented due to active recording
      setError(
        'Cannot disconnect while recording is active. Stop recording first.'
      );
      // Clear error after 3 seconds
      setTimeout(() => setError(null), 3000);
    }
  }, []);

  // Handle device picker events
  useEffect(() => {
    const handleShowDevicePicker = (event: CustomEvent) => {
      const { filteredDevices, rawDevices, enableRescan } = event.detail;
      safeBleDebugger.info('PICKER', '[BLE:PICKER] state=open', undefined, { 
        filteredCount: (filteredDevices || []).length,
        rawCount: (rawDevices || []).length
      });
      setFilteredDevices(filteredDevices || []);
      setRawDevices(rawDevices || []);
      setShowDevicePicker(true);
      setIsScanning(false); // Reset scanning state when picker shows
    };

    window.addEventListener('pmscan-show-device-picker', handleShowDevicePicker as EventListener);
    
    return () => {
      window.removeEventListener('pmscan-show-device-picker', handleShowDevicePicker as EventListener);
    };
  }, []);

  const handleDevicePickerSelect = useCallback((device: FoundDevice) => {
    PMScanConnectionUtils.resolveDevicePicker(device);
    safeBleDebugger.info('PICKER', '[BLE:PICKER] state=closed', undefined, { reason: 'selected' });
    setShowDevicePicker(false);
  }, []);

  const handleDevicePickerCancel = useCallback(() => {
    PMScanConnectionUtils.rejectDevicePicker();
    safeBleDebugger.info('PICKER', '[BLE:PICKER] state=closed', undefined, { reason: 'cancelled' });
    setShowDevicePicker(false);
  }, []);

  const handleForgetDevice = useCallback(() => {
    PMScanDeviceStorage.forgetPreferredDevice();
    // This will trigger a new scan and selection process
    setShowDevicePicker(false);
  }, []);

  const handleRescan = useCallback(async () => {
    setIsScanning(true);
    setShowDevicePicker(false);
    
    try {
      await PMScanConnectionUtils.rescanDevices();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Rescan failed');
    } finally {
      setIsScanning(false);
    }
  }, []);

  // Check for existing connection on component mount and re-establish event listeners
  useEffect(() => {
    let mounted = true;
    const manager = connectionManager;

    // Use requestIdleCallback for non-critical connection check to improve LCP
    if ('requestIdleCallback' in window) {
      (requestIdleCallback as any)(() => {
        if (!mounted) return;
        if (manager.isConnected()) {
          // Re-establish event listeners for the existing connection
          manager
            .reestablishEventListeners(
              handleRTData,
              handleIMData,
              handleBatteryData,
              handleChargingData
            )
            .then((deviceInfo) => {
              if (!mounted) return;
              if (deviceInfo) {
                setDevice(deviceInfo);
                logger.debug(
                  '🔄 Restored existing PMScan connection with event listeners'
                );
              }
            })
            .catch((error) => {
              if (!mounted) return;
              console.error('❌ Failed to restore connection:', error);
              const errorMessage = 'Failed to restore connection';
              
              // Show user-friendly toast for restore failure
              toast({
                title: "Échec de la restauration",
                description: 'Impossible de restaurer la connexion existante',
                variant: "destructive",
              });
              
              setError(errorMessage);
            });
        } else {
          // Ensure state is clean if no connection exists
          if (mounted) {
            setDevice(null);
            setCurrentData(null);
          }
        }
      });
    } else {
      setTimeout(() => {
        if (!mounted) return;
        if (manager.isConnected()) {
          // Re-establish event listeners for the existing connection
          manager
            .reestablishEventListeners(
              handleRTData,
              handleIMData,
              handleBatteryData,
              handleChargingData
            )
            .then((deviceInfo) => {
              if (!mounted) return;
              if (deviceInfo) {
                setDevice(deviceInfo);
                logger.debug(
                  '🔄 Restored existing PMScan connection with event listeners'
                );
              }
            })
            .catch((error) => {
              if (!mounted) return;
              console.error('❌ Failed to restore connection:', error);
              const errorMessage = 'Failed to restore connection';
              
              // Show user-friendly toast for restore failure
              toast({
                title: "Échec de la restauration",
                description: 'Impossible de restaurer la connexion existante',
                variant: "destructive",
              });
              
              setError(errorMessage);
            });
        } else {
          // Ensure state is clean if no connection exists
          if (mounted) {
            setDevice(null);
            setCurrentData(null);
          }
        }
      }, 0);
    }

    return () => {
      mounted = false;
    };
  }, [handleRTData, handleIMData, handleBatteryData, handleChargingData]);

  return {
    isConnected,
    isConnecting,
    device,
    currentData,
    error,
    requestDevice,
    disconnect,
    // Device picker state and handlers
    showDevicePicker,
    filteredDevices,
    rawDevices,
    onDevicePickerSelect: handleDevicePickerSelect,
    onDevicePickerCancel: handleDevicePickerCancel,
    onForgetDevice: handleForgetDevice,
    onRescan: handleRescan,
    isScanning,
  };
}
