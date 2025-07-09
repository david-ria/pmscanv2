import { AirBeamDevice } from './types';
import { AirBeamDeviceState } from './deviceState';
import { AIRBEAM_SPP_UUID } from './constants';

export class AirBeamDeviceInitializer {
  private deviceState: AirBeamDeviceState;

  constructor(deviceState: AirBeamDeviceState) {
    this.deviceState = deviceState;
  }

  public async initializeDevice(
    server: BluetoothRemoteGATTServer,
    device: BluetoothDevice,
    onDataReceived: (event: Event) => void
  ): Promise<{ deviceInfo: AirBeamDevice; service: BluetoothRemoteGATTService }> {
    console.log('🚀 Initializing AirBeam device...');

    try {
      // Get the Serial Port Profile service
      const service = await server.getPrimaryService(AIRBEAM_SPP_UUID);
      console.log('✅ Connected to AirBeam SPP service');

      // For AirBeam, we typically receive data through notifications on a characteristic
      // Try common characteristic UUIDs for serial data
      let dataCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
      
      try {
        // Try to get a characteristic that supports notifications
        // Common UUIDs for serial data transmission
        const commonUUIDs = [
          '00002a37-0000-1000-8000-00805f9b34fb', // Heart Rate Measurement (often used for data)
          '0000ffe1-0000-1000-8000-00805f9b34fb', // Common serial characteristic
          '6e400003-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART RX
        ];
        
        for (const uuid of commonUUIDs) {
          try {
            dataCharacteristic = await service.getCharacteristic(uuid);
            console.log(`📡 Found data characteristic: ${uuid}`);
            break;
          } catch (e) {
            // Continue to next UUID
          }
        }
      } catch (error) {
        console.warn('⚠️ Could not find suitable characteristic, will use default approach');
      }

      if (dataCharacteristic) {
        console.log('📡 Setting up data notifications...');
        await dataCharacteristic.startNotifications();
        dataCharacteristic.addEventListener('characteristicvaluechanged', onDataReceived);
      } else {
        console.warn('⚠️ No suitable characteristic found for data notifications');
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

      console.log('✅ AirBeam device initialized successfully');
      return { deviceInfo, service };

    } catch (error) {
      console.error('❌ Failed to initialize AirBeam device:', error);
      throw error;
    }
  }
}