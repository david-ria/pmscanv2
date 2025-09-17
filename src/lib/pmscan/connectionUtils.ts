import { PMScan_SERVICE_UUID, PMScan_MODE_UUID } from './constants';
import * as logger from '@/utils/logger';
import { runBleScan } from '@/lib/bleScan';
import { Capacitor } from '@capacitor/core';

/**
 * Utility functions for PMScan connection management
 */
export class PMScanConnectionUtils {
  public static async requestBluetoothDevice(): Promise<BluetoothDevice> {
    // Use unified BLE scan that works on both mobile and web
    logger.debug('🔍 Scanning for PMScan devices...');
    const devices = await runBleScan({ 
      timeoutMs: 10000, 
      services: [PMScan_SERVICE_UUID] 
    });

    if (devices.length === 0) {
      throw new Error('No PMScan devices found');
    }

    // On Capacitor, the connection is handled by the connection manager
    if (Capacitor.isNativePlatform()) {
      // This should not be called directly on native - use connection manager
      throw new Error('Use PMScanConnectionManager for native BLE connections');
    }

    // Web fallback - the scan already triggered requestDevice
    if (!navigator.bluetooth) {
      throw new Error('Bluetooth not available in this browser');
    }

    const device = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: 'PMScan' }],
      optionalServices: [PMScan_SERVICE_UUID],
    });

    logger.debug('📱 Connected to ' + device.name);
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
