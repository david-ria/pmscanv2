import { useState, useCallback, useRef, useEffect } from 'react';
import { DeviceConnectionState, DeviceConnectionMethods, DeviceType, UnifiedDeviceData } from '@/lib/device/types';
import { detectDeviceType } from '@/lib/device/deviceDetection';
import { usePMScanBluetooth } from './usePMScanBluetooth';
import { useAirBeamBluetooth } from './useAirBeamBluetooth';

export function useUnifiedDeviceConnection(): DeviceConnectionState & DeviceConnectionMethods {
  const [selectedDeviceType, setSelectedDeviceType] = useState<DeviceType | null>(null);
  const [manualDeviceType, setManualDeviceType] = useState<DeviceType | null>(null);

  // PMScan hook
  const pmScanConnection = usePMScanBluetooth();
  
  // AirBeam hook  
  const airBeamConnection = useAirBeamBluetooth();

  // Determine active connection based on device type
  const getActiveConnection = useCallback(() => {
    const deviceType = selectedDeviceType || manualDeviceType;
    
    if (deviceType === 'pmscan') {
      return pmScanConnection;
    } else if (deviceType === 'airbeam') {
      return airBeamConnection;
    }
    
    // Return the connected one if any
    if (pmScanConnection.isConnected) {
      return pmScanConnection;
    } else if (airBeamConnection.isConnected) {
      return airBeamConnection;
    }
    
    // Default to PMScan for backward compatibility
    return pmScanConnection;
  }, [selectedDeviceType, manualDeviceType, pmScanConnection, airBeamConnection]);

  const activeConnection = getActiveConnection();

  const requestDevice = useCallback(async (deviceType?: DeviceType) => {
    try {
      if (deviceType) {
        setManualDeviceType(deviceType);
        setSelectedDeviceType(deviceType);
        
        if (deviceType === 'pmscan') {
          await pmScanConnection.requestDevice();
        } else if (deviceType === 'airbeam') {
          await airBeamConnection.requestDevice();
        }
      } else {
        // Auto-detect device type through device selection
        // Start with PMScan for backward compatibility
        try {
          await pmScanConnection.requestDevice();
          setSelectedDeviceType('pmscan');
        } catch (pmScanError) {
          console.log('PMScan connection failed, trying AirBeam...');
          try {
            await airBeamConnection.requestDevice();
            setSelectedDeviceType('airbeam');
          } catch (airBeamError) {
            throw new Error('Failed to connect to any supported device');
          }
        }
      }
    } catch (error) {
      console.error('❌ Error requesting device:', error);
      throw error;
    }
  }, [pmScanConnection, airBeamConnection]);

  const disconnect = useCallback(async () => {
    if (selectedDeviceType === 'pmscan') {
      await pmScanConnection.disconnect();
    } else if (selectedDeviceType === 'airbeam') {
      await airBeamConnection.disconnect();
    } else {
      // Disconnect all if unknown
      await Promise.all([
        pmScanConnection.disconnect(),
        airBeamConnection.disconnect()
      ]);
    }
    
    setSelectedDeviceType(null);
    setManualDeviceType(null);
  }, [selectedDeviceType, pmScanConnection, airBeamConnection]);

  // Auto-detect device type when device name is available
  useEffect(() => {
    if (activeConnection.device?.name && !selectedDeviceType) {
      const detectedType = detectDeviceType(activeConnection.device.name);
      if (detectedType) {
        setSelectedDeviceType(detectedType);
      }
    }
  }, [activeConnection.device?.name, selectedDeviceType]);

  return {
    isConnected: activeConnection.isConnected,
    isConnecting: activeConnection.isConnecting,
    device: activeConnection.device,
    currentData: activeConnection.currentData,
    error: activeConnection.error,
    deviceType: selectedDeviceType,
    requestDevice,
    disconnect,
    detectDeviceType
  };
}