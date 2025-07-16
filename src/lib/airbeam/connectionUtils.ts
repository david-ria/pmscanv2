import { AIRBEAM_SERVICE_UUID } from './constants';
import * as logger from '@/utils/logger';

export class AirBeamConnectionUtils {
  public static async requestBluetoothDevice(): Promise<BluetoothDevice> {
    if (!navigator.bluetooth) {
      throw new Error('Bluetooth not available in this browser');
    }

    logger.debug('🔍 Requesting AirBeam device...');
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: 'AirBeam' }],
      optionalServices: [AIRBEAM_SERVICE_UUID],
    });

    logger.debug('📱 Requested ' + device.name);
    return device;
  }

  public static async connectToDevice(
    device: BluetoothDevice
  ): Promise<BluetoothRemoteGATTServer> {
    logger.debug('🔌 Connecting to AirBeam device...');
    const server = await device.gatt!.connect();
    return server;
  }
}
