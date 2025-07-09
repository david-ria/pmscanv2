import { AIRBEAM_SPP_UUID, AIRBEAM_NAME_PATTERNS } from './constants';

/**
 * Utility functions for AirBeam connection management
 */
export class AirBeamConnectionUtils {
  public static async requestBluetoothDevice(): Promise<BluetoothDevice> {
    if (!navigator.bluetooth) {
      throw new Error('Bluetooth not available in this browser');
    }

    console.log('🔍 Requesting AirBeam Bluetooth device...');
    
    // Try to find AirBeam devices by name pattern
    const filters = AIRBEAM_NAME_PATTERNS.map(pattern => ({
      namePrefix: pattern
    }));
    
    const device = await navigator.bluetooth.requestDevice({
      filters,
      optionalServices: [AIRBEAM_SPP_UUID]
    });

    console.log('📱 Found AirBeam device:', device.name);
    return device;
  }

  public static async connectToDevice(device: BluetoothDevice): Promise<BluetoothRemoteGATTServer> {
    console.log('🔌 Connecting to AirBeam Device...');
    const server = await device.gatt!.connect();
    return server;
  }

  public static isAirBeamDevice(deviceName: string): boolean {
    if (!deviceName) return false;
    
    return AIRBEAM_NAME_PATTERNS.some(pattern => 
      deviceName.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  public static async sendDisconnectCommand(
    service: BluetoothRemoteGATTService
  ): Promise<void> {
    try {
      console.log('🔌 Requesting AirBeam disconnect...');
      // AirBeam typically disconnects gracefully without special commands
      // The device will handle disconnection when the connection is closed
    } catch (err) {
      console.error('❌ Failed to send AirBeam disconnect command:', err);
      throw err;
    }
  }
}