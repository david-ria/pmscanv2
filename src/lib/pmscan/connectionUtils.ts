import { PMScan_SERVICE_UUID, PMScan_MODE_UUID } from './constants';

/**
 * Utility functions for PMScan connection management
 */
export class PMScanConnectionUtils {
  public static async requestBluetoothDevice(): Promise<BluetoothDevice> {
    if (!navigator.bluetooth) {
      throw new Error('Bluetooth not available in this browser');
    }

    console.log('🔍 Requesting any Bluetooth device...');
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: "PMScan" }],
      optionalServices: [PMScan_SERVICE_UUID]
    });

    console.log('📱 Requested ' + device.name);
    return device;
  }

  public static async connectToDevice(device: BluetoothDevice): Promise<BluetoothRemoteGATTServer> {
    console.log('🔌 Connecting to Bluetooth Device...');
    const server = await device.gatt!.connect();
    return server;
  }

  public static async sendDisconnectCommand(
    service: BluetoothRemoteGATTService,
    mode: number
  ): Promise<void> {
    try {
      console.log('🔌 Requesting disconnect...');
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