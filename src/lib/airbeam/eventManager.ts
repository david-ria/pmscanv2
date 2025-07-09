import { AirBeamDevice } from './types';
import { AirBeamDeviceState } from './deviceState';
import { AIRBEAM_SPP_UUID } from './constants';

export class AirBeamEventManager {
  private deviceState: AirBeamDeviceState;

  constructor(deviceState: AirBeamDeviceState) {
    this.deviceState = deviceState;
  }

  public async reestablishEventListeners(
    service: BluetoothRemoteGATTService,
    device: BluetoothDevice,
    onDataReceived: (event: Event) => void
  ): Promise<AirBeamDevice | null> {
    try {
      console.log('🔄 Re-establishing AirBeam event listeners...');

      // Find the data characteristic again using common UUIDs
      let dataCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
      
      const commonUUIDs = [
        '00002a37-0000-1000-8000-00805f9b34fb', // Heart Rate Measurement
        '0000ffe1-0000-1000-8000-00805f9b34fb', // Common serial characteristic
        '6e400003-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART RX
      ];
      
      for (const uuid of commonUUIDs) {
        try {
          dataCharacteristic = await service.getCharacteristic(uuid);
          break;
        } catch (e) {
          // Continue to next UUID
        }
      }

      if (dataCharacteristic) {
        // Re-establish notifications
        await dataCharacteristic.startNotifications();
        dataCharacteristic.addEventListener('characteristicvaluechanged', onDataReceived);
        console.log('✅ AirBeam event listeners re-established');
      }

      const deviceInfo: AirBeamDevice = {
        id: device.id,
        name: device.name || 'AirBeam Device',
        connected: true,
        battery: this.deviceState.state.battery,
        charging: this.deviceState.state.charging,
        version: this.deviceState.state.version,
        type: 'airbeam'
      };

      return deviceInfo;

    } catch (error) {
      console.error('❌ Failed to re-establish AirBeam event listeners:', error);
      return null;
    }
  }
}