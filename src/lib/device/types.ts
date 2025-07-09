import { PMScanData, PMScanDevice } from '@/lib/pmscan/types';
import { AirBeamData, AirBeamDevice } from '@/lib/airbeam/types';

// Unified device types
export type DeviceType = 'pmscan' | 'airbeam';

export type UnifiedDeviceData = PMScanData | AirBeamData;
export type UnifiedDevice = PMScanDevice | AirBeamDevice;

export interface DeviceConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  device: UnifiedDevice | null;
  currentData: UnifiedDeviceData | null;
  error: string | null;
  deviceType: DeviceType | null;
}

export interface DeviceConnectionMethods {
  requestDevice: (deviceType?: DeviceType) => Promise<void>;
  disconnect: () => Promise<void>;
  detectDeviceType: (deviceName: string) => DeviceType | null;
}