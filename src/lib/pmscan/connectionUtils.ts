import { PMScan_SERVICE_UUID, PMScan_MODE_UUID } from './constants';
import { FILTERED_SCAN_OPTIONS, UNIVERSAL_SCAN_OPTIONS } from '@/lib/sensorConstants';
import * as logger from '@/utils/logger';

/**
 * Utility functions for PMScan connection management
 */
export class PMScanConnectionUtils {
  public static async requestBluetoothDevice(): Promise<BluetoothDevice> {
    if (!navigator.bluetooth) {
      throw new Error('Bluetooth not available in this browser');
    }

    logger.debug('🔍 Step 1: Trying filtered scan for known sensor names...');
    
    try {
      // Étape 1: Essayer d'abord avec les filtres stricts par nom
      const device = await navigator.bluetooth.requestDevice(FILTERED_SCAN_OPTIONS);
      logger.debug(`📱 Device found with filtered scan: ${device.name || 'Unknown'}`);
      return device;
    } catch (filteredErr) {
      // Si l'utilisateur annule ou aucun appareil trouvé, essayer le scan large
      if (filteredErr instanceof Error && filteredErr.name === 'NotFoundError') {
        logger.debug('⚠️ Filtered scan cancelled or no devices found, trying wide scan...');
        
        // Étape 2: Scan large - affiche TOUS les appareils Bluetooth
        logger.debug('🔍 Step 2: Wide scan - showing ALL Bluetooth devices...');
        const device = await navigator.bluetooth.requestDevice(UNIVERSAL_SCAN_OPTIONS);
        logger.debug(`📱 Device found with wide scan: ${device.name || 'Unknown'}`);
        return device;
      }
      throw filteredErr;
    }
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
