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
  // New particle count data (Nb/L)
  particles_02_05?: number; // 0.2µm to 0.5µm
  particles_05_10?: number; // 0.5µm to 1.0µm
  particles_10_25?: number; // 1.0µm to 2.5µm
  particles_25_50?: number; // 2.5µm to 5.0µm
  particles_50_100?: number; // 5.0µm to 10.0µm
  // External sensor data
  external_temperature?: number; // External temperature (°C)
  external_humidity?: number; // External humidity (%)
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
