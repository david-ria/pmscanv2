export interface PMScanData {
  pm1: number;
  pm25: number;
  pm10: number;
  temp: number;
  humidity: number;
  battery: number;
  charging: boolean;
  timestamp: Date;
  location?: string;
}

export interface PMScanDevice {
  name: string;
  version: number;
  mode: number;
  interval: number;
  battery: number;
  charging: boolean;
  connected: boolean;
}

export interface PMScanInternalState {
  name: string;
  version: number;
  mode: number;
  interval: number;
  display: Uint8Array;
  battery: number;
  charging: number;
  dataLogger: boolean;
  externalMemory: number;
}
