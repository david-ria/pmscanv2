import { PMScan_SERVICE_UUID, PMScan_MODE_UUID } from './constants';
import { SENSOR_GATT_CONFIG } from '@/lib/sensorConstants';
import { Capacitor } from '@capacitor/core';
import * as logger from '@/utils/logger';

// Configuration SPÉCIFIQUE pour le Web - acceptAllDevices obligatoire
// Note: On cast car les types TypeScript de Web Bluetooth sont incomplets
const WEB_SCAN_OPTIONS = {
  // On accepte tout car on ne connait pas les UUIDs exacts à l'avance
  acceptAllDevices: true,
  // CRITIQUE : Liste des services optionnels pour pouvoir lire les données après connexion
  optionalServices: [
    // Services standards
    '0000180f-0000-1000-8000-00805f9b34fb', // Battery Service
    '0000181a-0000-1000-8000-00805f9b34fb', // Environmental Sensing
    '0000180a-0000-1000-8000-00805f9b34fb', // Device Information
    // PMScan
    SENSOR_GATT_CONFIG.pmscan.serviceUuid,
    'f3641900-00b0-4240-ba50-05ca45bf8abc',
    // AirBeam OFFICIAL FFF0 Service
    '0000fff0-0000-1000-8000-00805f9b34fb', // OFFICIAL AirBeam FFF0 service
    SENSOR_GATT_CONFIG.airbeam.serviceUuid,
    // Atmotube PRO 2 - OFFICIAL UUID
    'bda3c091-e5e0-4dac-8170-7fcef187a1d0', // Official Atmotube PRO 2 service
    '4b13a770-4ccb-11e5-a151-0002a5d5c51b', // Legacy Atmotube service
    SENSOR_GATT_CONFIG.atmotube.serviceUuid,
  ]
} as RequestDeviceOptions;

/**
 * Utility functions for PMScan connection management
 */
export class PMScanConnectionUtils {
  public static async requestBluetoothDevice(): Promise<BluetoothDevice> {
    if (!navigator.bluetooth) {
      throw new Error('Bluetooth not available in this browser');
    }

    // Détection du mode : Web ou Natif
    const isNative = Capacitor.isNativePlatform();
    
    if (isNative) {
      // Mode Natif - utiliser les filtres par nom (géré par Capacitor BleClient séparément)
      logger.debug('🔍 Native platform detected - using filtered scan');
      throw new Error('Use Capacitor BleClient for native platforms');
    }

    // Mode WEB - acceptAllDevices obligatoire
    logger.debug('🌐 Web platform detected - using acceptAllDevices: true');
    logger.debug('📋 Optional services:', WEB_SCAN_OPTIONS.optionalServices);
    
    const device = await navigator.bluetooth.requestDevice(WEB_SCAN_OPTIONS);
    
    logger.debug(`📱 User selected device: ${device.name || 'Unknown'}`);
    logger.debug(`📱 Device ID: ${device.id}`);
    
    return device;
  }

  public static async connectToDevice(
    device: BluetoothDevice
  ): Promise<BluetoothRemoteGATTServer> {
    logger.debug('🔌 Connecting to Bluetooth Device...');
    const server = await device.gatt!.connect();
    return server;
  }

  public static async sendDisconnectCommand(
    service: BluetoothRemoteGATTService,
    mode: number
  ): Promise<void> {
    try {
      logger.debug('🔌 Requesting disconnect...');
      const modeChar = await service.getCharacteristic(PMScan_MODE_UUID);
      const modeToWrite = new Uint8Array(1);
      modeToWrite[0] = mode | 0x40;
      await modeChar.writeValueWithResponse(modeToWrite);
    } catch (err) {
      console.error('❌ Failed to send disconnect command:', err);
      throw err;
    }
  }
}
