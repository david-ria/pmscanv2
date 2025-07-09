export interface AirBeamData {
  timestamp: Date;
  pm1: number;
  pm25: number;
  pm10: number;
  temperature?: number;
  humidity?: number;
  sessionId?: string;
}

export interface AirBeamDevice {
  id: string;
  name: string;
  connected: boolean;
  battery?: number;
  charging?: boolean;
  version?: string;
  type: 'airbeam';
}

export interface AirBeamState {
  sessionId: string;
  battery: number;
  charging: boolean;
  version: string;
}