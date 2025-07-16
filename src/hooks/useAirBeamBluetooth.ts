import { useState } from 'react';
import { PMScanData, PMScanDevice } from '@/lib/pmscan/types';

// Placeholder hook for connecting to an AirBeam sensor.
// It exposes the same API as usePMScanBluetooth so the UI can
// handle either device type transparently.
export function useAirBeamBluetooth() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [device, setDevice] = useState<PMScanDevice | null>(null);
  const [currentData, setCurrentData] = useState<PMScanData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // These functions would contain real Web Bluetooth logic. For now we
  // simply mock a connection so the application can be exercised without
  // an actual AirBeam device.
  const requestDevice = async () => {
    try {
      setIsConnecting(true);
      // Pretend a device was found
      const mockDevice: PMScanDevice = {
        name: 'AirBeam',
        version: 1,
        mode: 0,
        interval: 1000,
        battery: 100,
        charging: false,
        connected: true,
      };
      setDevice(mockDevice);
      setIsConnected(true);
      setIsConnecting(false);
      // Emit dummy data once so components render something
      const now = new Date();
      setCurrentData({
        pm1: 0,
        pm25: 0,
        pm10: 0,
        temp: 0,
        humidity: 0,
        battery: 100,
        charging: false,
        timestamp: now,
      });
    } catch (err) {
      setError('Failed to connect to AirBeam');
      setIsConnecting(false);
    }
  };

  const disconnect = async () => {
    setIsConnected(false);
    setDevice(null);
    setCurrentData(null);
  };

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
