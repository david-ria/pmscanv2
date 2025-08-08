import { useState, useCallback, useRef, useEffect } from 'react';
import { PMScanData, PMScanDevice } from '@/lib/pmscan/types';
import { parsePMScanDataPayload } from '@/lib/pmscan/dataParser';
import { exponentialBackoff } from '@/lib/pmscan/utils';
import { globalConnectionManager } from '@/lib/pmscan/globalConnectionManager';
import * as logger from '@/utils/logger';

export function usePMScanBluetooth() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [device, setDevice] = useState<PMScanDevice | null>(null);
  const [currentData, setCurrentData] = useState<PMScanData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Use global connection manager to persist across component unmounts
  const connectionManager = globalConnectionManager;

  // Background polling while tab is hidden (fallback when notifications are throttled)
  const backgroundPollRef = useRef<NodeJS.Timeout | null>(null);

  const startBackgroundPoll = useCallback(() => {
    if (backgroundPollRef.current || !isConnected) return;
    backgroundPollRef.current = setInterval(async () => {
      try {
        const data = await connectionManager.readCurrentRTData();
        if (!data) return;
        // Deduplicate like RT handler
        setCurrentData((prevData) => {
          const isDifferent =
            !prevData ||
            Math.abs(prevData.pm25 - data.pm25) >= 0.1 ||
            Math.abs(prevData.pm1 - data.pm1) >= 0.1 ||
            Math.abs(prevData.pm10 - data.pm10) >= 0.1 ||
            data.timestamp.getTime() - prevData.timestamp.getTime() >= 1000;
          if (isDifferent) {
            logger.rateLimitedDebug('pmbluetooth.bgpoll', 5000, '📥 Background polled RT data');
            return data;
          }
          return prevData;
        });
      } catch (e) {
        logger.debug('⚠️ Background RT poll failed:', e);
      }
    }, 2000);
  }, [connectionManager, isConnected]);

  const stopBackgroundPoll = useCallback(() => {
    if (backgroundPollRef.current) {
      clearInterval(backgroundPollRef.current);
      backgroundPollRef.current = null;
    }
  }, []);

  // Event handlers
  const handleRTData = useCallback((event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    if (target.value) {
      const data = parsePMScanDataPayload(
        target.value,
        connectionManager.state
      );

      // Only update and log if data is significantly different to avoid duplicates
      setCurrentData((prevData) => {
        const isDifferent =
          !prevData ||
          Math.abs(prevData.pm25 - data.pm25) >= 0.1 ||
          Math.abs(prevData.pm1 - data.pm1) >= 0.1 ||
          Math.abs(prevData.pm10 - data.pm10) >= 0.1 ||
          data.timestamp.getTime() - prevData.timestamp.getTime() >= 1000; // 1 second minimum

        if (isDifferent) {
          logger.rateLimitedDebug(
            'pmbluetooth.rtdata',
            5000,
            '🔄 RT Data received:',
            data
          );
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
    async (server: BluetoothRemoteGATTServer) => {
      try {
        const manager = connectionManager;
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
    },
    [handleRTData, handleIMData, handleBatteryData, handleChargingData]
  );

  const onDeviceDisconnected = useCallback(() => {
    connectionManager.onDisconnected();
    setIsConnected(false);
    setDevice((prev) => (prev ? { ...prev, connected: false } : null));
    stopBackgroundPoll();
  }, [stopBackgroundPoll]);

  const connect = useCallback(() => {
    const manager = connectionManager;
    logger.debug(
      '🔄 connect() called, shouldConnect:',
      manager.shouldAutoConnect()
    );

    if (!manager.shouldAutoConnect()) return;

    exponentialBackoff(
      10,
      1.2,
      () => manager.connect(),
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

      const manager = connectionManager;
      const device = await manager.requestDevice();

      device.addEventListener('gattserverdisconnected', () => {
        logger.debug('🔌 PMScan Device disconnected');
        onDeviceDisconnected();
        connect();
      });

      connect();
    } catch (error) {
      console.error('❌ Error requesting device:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to connect to device'
      );
      setIsConnecting(false);
    }
  }, [connect, onDeviceDisconnected]);

  const disconnect = useCallback(async () => {
    const success = await connectionManager.disconnect();
    if (success) {
      setIsConnected(false);
      setDevice(null);
      setCurrentData(null);
      stopBackgroundPoll();
    } else {
      // Show warning that disconnection was prevented due to active recording
      setError(
        'Cannot disconnect while recording is active. Stop recording first.'
      );
      // Clear error after 3 seconds
      setTimeout(() => setError(null), 3000);
    }
  }, [stopBackgroundPoll]);

  // Re-establish event listeners if already connected
  useEffect(() => {
    let mounted = true;
    const manager = connectionManager;

    // Use requestIdleCallback for non-critical connection check to improve LCP
    const idleCallback = window.requestIdleCallback || ((cb) => setTimeout(cb, 0));
    
    idleCallback(() => {
      if (!mounted) return;
      
      if (manager.isConnected()) {
        setIsConnected(true);

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
            setError('Failed to restore connection');
          });
      } else {
        // Ensure state is clean if no connection exists
        if (mounted) {
          setIsConnected(false);
          setDevice(null);
          setCurrentData(null);
        }
      }
    });

    return () => {
      mounted = false;
    };
  }, [handleRTData, handleIMData, handleBatteryData, handleChargingData]);

  // Toggle background polling based on visibility and connection
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden && isConnected) {
        startBackgroundPoll();
      } else {
        stopBackgroundPoll();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    // Run once on mount and whenever isConnected changes
    onVisibilityChange();
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      stopBackgroundPoll();
    };
  }, [isConnected, startBackgroundPoll, stopBackgroundPoll]);

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
