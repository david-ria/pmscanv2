import { PMScan_SERVICE_UUID, PMScan_MODE_UUID } from './constants';
import { Capacitor } from '@capacitor/core';
import * as logger from '@/utils/logger';

/**
 * Configuration Web Bluetooth avec filtres explicites pour forcer la découverte
 * des services BLE des capteurs supportés.
 * 
 * IMPORTANT: Les services DOIVENT être dans optionalServices pour être accessibles
 * après connexion, même s'ils sont déjà dans filters.
 */
export const WEB_SCAN_OPTIONS: RequestDeviceOptions = {
  // Filtres par nom ET par service pour maximiser la découverte
  filters: [
    // Filtres par nom de capteur
    { namePrefix: 'AirBeam' },
    { namePrefix: 'Atmotube' },
    { namePrefix: 'PMScan' },
    // Filtre par service AirBeam FFF0 - force Chrome à découvrir ce service
    { services: ['0000fff0-0000-1000-8000-00805f9b34fb'] },
  ],
  // CRITIQUE: Ces services doivent être listés ici pour être accessibles après connexion
  optionalServices: [
    // AirBeam 2/3 - Service principal FFF0 (CONFIRMÉ via nRF Connect)
    '0000fff0-0000-1000-8000-00805f9b34fb',
    // Services standards BLE
    '0000181a-0000-1000-8000-00805f9b34fb', // Environmental Sensing (0x181A)
    '0000180f-0000-1000-8000-00805f9b34fb', // Battery Service (0x180F)
    '0000180a-0000-1000-8000-00805f9b34fb', // Device Information (0x180A)
    // Nordic UART Service (utilisé par certains ESP32)
    '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
    // Atmotube PRO 2
    'bda3c091-e5e0-4dac-8170-7fcef187a1d0',
    // Atmotube PRO
    'db450001-8e9a-4818-add7-6ed94a328ab4',
    // PMScan
    'f3641900-00b0-4240-ba50-05ca45bf8abc',
    // Service FFE0 (HM-10 style modules)
    '0000ffe0-0000-1000-8000-00805f9b34fb',
  ]
};

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

    // Mode WEB - utiliser les filtres explicites avec optionalServices
    logger.debug('🌐 Web platform detected - using explicit filters with optionalServices');
    logger.debug('📋 Filters:', WEB_SCAN_OPTIONS.filters);
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
