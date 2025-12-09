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
  // Ces services DOIVENT être listés ici pour que Chrome autorise l'accès après connexion
  optionalServices: [
    // Services standards BLE
    '0000180f-0000-1000-8000-00805f9b34fb', // Battery Service (0x180F)
    '0000181a-0000-1000-8000-00805f9b34fb', // Environmental Sensing (0x181A)
    '0000180a-0000-1000-8000-00805f9b34fb', // Device Information (0x180A)
    
    // PMScan
    SENSOR_GATT_CONFIG.pmscan.serviceUuid,
    
    // AirBeam 2/3 - CONFIRMÉ via nRF Connect
    '0000fff0-0000-1000-8000-00805f9b34fb', // FFF0 Service Principal (PM + Env)
    SENSOR_GATT_CONFIG.airbeam.serviceUuid, // Alias
    
    // Atmotube PRO / PRO 2
    'bda3c091-e5e0-4dac-8170-7fcef187a1d0', // Atmotube PRO 2 service
    'db450001-8e9a-4818-add7-6ed94a328ab4', // Atmotube PRO service
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
