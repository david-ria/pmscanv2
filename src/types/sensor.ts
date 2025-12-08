// src/types/sensor.ts - Unified sensor data abstraction
// Renamed from src/lib/pmscan/types.ts

export interface SensorReadingData {
  pm1: number;
  pm25: number;
  pm10: number;
  temp: number;
  humidity: number;
  // Extended fields for COV/CO2 sensors
  co2?: number;
  voc?: number;
  // Battery and device info
  battery: number;
  charging: boolean;
  timestamp: Date;
  location?: string;
}

// Interface d'abstraction pour tous les adaptateurs de capteurs
export interface ISensorAdapter {
  sensorId: string; // Ex: 'pmscan', 'airbeam', 'atmotube'
  name: string;
  
  // Méthodes requises par l'application
  requestDevice(): Promise<BluetoothDevice>;
  connect(device: BluetoothDevice): Promise<BluetoothRemoteGATTServer>;
  disconnect(force?: boolean): Promise<boolean>;
  
  // Récupère une lecture unifiée (Polling ou dernière notification)
  getLiveReading(): SensorReadingData | null;
  
  // Met en place tous les écouteurs de notifications GATT spécifiques
  initializeNotifications(
    server: BluetoothRemoteGATTServer, 
    device: BluetoothDevice, 
    onDataCallback: (data: SensorReadingData) => void
  ): Promise<void>;
  
  // Met à jour l'état de la batterie/charge (si l'adaptateur le supporte)
  updateBattery(level: number): void;
  updateCharging(status: number): void;
}

// Legacy PMScan-specific types (keep for backward compatibility)
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

// Type alias for backward compatibility
export type PMScanData = SensorReadingData;
