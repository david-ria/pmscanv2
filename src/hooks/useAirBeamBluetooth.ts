import { useState } from 'react';
import { PMScanData, PMScanDevice } from '@/lib/pmscan/types';

// Hook for connecting to an AirBeam sensor.
// Exposes the same API as usePMScanBluetooth for transparent use.
export function useAirBeamBluetooth() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [device, setDevice] = useState<PMScanDevice | null>(null);
  const [currentData, setCurrentData] = useState<PMScanData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestDevice = async () => {
    try {
      setIsConnecting(true);
      // Simulate device detection
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
