export interface ConnectionStatus {
  connected: boolean;
  connecting: boolean;
  error: string | null;
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

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number;
  timestamp: Date;
}
