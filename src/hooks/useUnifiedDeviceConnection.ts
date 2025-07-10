import { useState, useCallback, useRef, useEffect } from 'react';
import { DeviceConnectionState, DeviceConnectionMethods, DeviceType, UnifiedDeviceData } from '@/lib/device/types';
import { detectDeviceType } from '@/lib/device/deviceDetection';
import { usePMScanBluetooth } from './usePMScanBluetooth';
import { useAirBeamBluetooth } from './useAirBeamBluetooth';

interface AvailableDevice {
  name: string;
  type: DeviceType;
  device: BluetoothDevice;
}

export function useUnifiedDeviceConnection(): DeviceConnectionState & DeviceConnectionMethods & {
  scanForDevices: () => Promise<AvailableDevice[]>;
  connectToDevice: (device: AvailableDevice) => Promise<void>;
} {
  const [selectedDeviceType, setSelectedDeviceType] = useState<DeviceType | null>(null);
  const [manualDeviceType, setManualDeviceType] = useState<DeviceType | null>(null);
  const [isScanning, setIsScanning] = useState(false);

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
  
  // Add debugging for connection state
  useEffect(() => {
    // Only log occasionally to prevent spam
    const shouldLog = Math.random() < 0.1; // 10% chance
    if (shouldLog) {
      console.log('🔧 Unified Device Connection State:', {
        selectedDeviceType,
        manualDeviceType,
        pmScanConnected: pmScanConnection.isConnected,
        airBeamConnected: airBeamConnection.isConnected,
        activeConnectionType: selectedDeviceType || manualDeviceType || 'auto-detected',
        currentData: activeConnection.currentData ? 'has data' : 'no data',
        airBeamError: airBeamConnection.error,
        pmScanError: pmScanConnection.error
      });
    }
  }, [selectedDeviceType, manualDeviceType, pmScanConnection.isConnected, airBeamConnection.isConnected, activeConnection.currentData, airBeamConnection.error, pmScanConnection.error]);

  const requestDevice = useCallback(async (deviceType?: DeviceType) => {
    try {
      console.log('🔌 Requesting device with type:', deviceType);
      if (deviceType) {
        setManualDeviceType(deviceType);
        setSelectedDeviceType(deviceType);
        
        if (deviceType === 'pmscan') {
          console.log('🔌 Connecting to PMScan...');
          await pmScanConnection.requestDevice();
        } else if (deviceType === 'airbeam') {
          console.log('🔌 Connecting to AirBeam...');
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

  const scanForDevices = useCallback(async (): Promise<AvailableDevice[]> => {
    setIsScanning(true);
    const devices: AvailableDevice[] = [];
    
    try {
      // Use a general filter to show most Bluetooth LE devices
      const bluetoothDevice = await navigator.bluetooth.requestDevice({
        optionalServices: [
          '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // PMScan service
          '0000180f-0000-1000-8000-00805f9b34fb'  // Battery service (common)
        ],
        acceptAllDevices: true
      } as any); // TypeScript workaround for acceptAllDevices
      
      if (bluetoothDevice && bluetoothDevice.name) {
        const detectedType = detectDeviceType(bluetoothDevice.name);
        devices.push({
          name: bluetoothDevice.name,
          type: detectedType || 'pmscan',
          device: bluetoothDevice
        });
      }
    } catch (error) {
      console.log('No devices found or user cancelled');
    } finally {
      setIsScanning(false);
    }
    
    return devices;
  }, []);

  const connectToDevice = useCallback(async (deviceInfo: AvailableDevice) => {
    setSelectedDeviceType(deviceInfo.type);
    setManualDeviceType(deviceInfo.type);
    
    if (deviceInfo.type === 'pmscan') {
      await pmScanConnection.requestDevice();
    } else if (deviceInfo.type === 'airbeam') {
      await airBeamConnection.requestDevice();
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
    isConnecting: activeConnection.isConnecting || isScanning,
    device: activeConnection.device,
    currentData: activeConnection.currentData,
    error: activeConnection.error,
    deviceType: selectedDeviceType,
    requestDevice,
    disconnect,
    detectDeviceType,
    scanForDevices,
    connectToDevice
  };
}