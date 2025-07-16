export interface AirBeamData {
  pm1: number;
  pm25: number;
  pm10: number;
  temp: number;
  humidity: number;
  battery?: number;
  charging?: boolean;
  timestamp: Date;
  location?: string;
}

export interface AirBeamDevice {
  name: string;
  version: number;
  mode: number;
  interval: number;
  battery: number;
  charging: boolean;
  connected: boolean;
}

export interface AirBeamInternalState {
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
