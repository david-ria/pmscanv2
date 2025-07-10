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
    console.log('🔍 Device name:', device.name);
    console.log('🔍 Device ID:', device.id);

    try {
      // First, let's see what services are available
      console.log('🔍 Getting available services...');
      
      let service: BluetoothRemoteGATTService;
      try {
        service = await server.getPrimaryService(AIRBEAM_SPP_UUID);
        console.log('✅ Connected to AirBeam SPP service');
      } catch (sppError) {
        console.log('⚠️ SPP service not found, trying common BLE services...');
        
        // Try common BLE service UUIDs that might be used by AirBeam-compatible devices
        const commonServiceUUIDs = [
          '0000180f-0000-1000-8000-00805f9b34fb', // Battery Service
          '0000180a-0000-1000-8000-00805f9b34fb', // Device Information Service
          '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART Service
          '0000ffe0-0000-1000-8000-00805f9b34fb', // Common custom service
        ];
        
        let foundService = false;
        for (const serviceUuid of commonServiceUUIDs) {
          try {
            service = await server.getPrimaryService(serviceUuid);
            console.log(`📡 Found service: ${serviceUuid}`);
            foundService = true;
            break;
          } catch (e) {
            // Continue to next service
          }
        }
        
        if (!foundService) {
          throw new Error('No compatible services found on this device');
        }
      }

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
        console.log('📡 Setting up data notifications on characteristic:', dataCharacteristic.uuid);
        await dataCharacteristic.startNotifications();
        dataCharacteristic.addEventListener('characteristicvaluechanged', onDataReceived);
        console.log('✅ Notifications enabled, waiting for data...');
      } else {
        console.warn('⚠️ No suitable characteristic found with common UUIDs, trying additional ones...');
        
        // Try additional characteristic UUIDs that might be used by different AirBeam models
        const additionalUUIDs = [
          '0000fff1-0000-1000-8000-00805f9b34fb', // Another common custom characteristic
          '0000fff4-0000-1000-8000-00805f9b34fb', // Custom characteristic variant
          '49535343-fe7d-4ae5-8fa9-9fafd205e455', // Microchip data characteristic
          '0000fef4-0000-1000-8000-00805f9b34fb', // Custom data characteristic
        ];
        
        for (const uuid of additionalUUIDs) {
          try {
            dataCharacteristic = await service.getCharacteristic(uuid);
            console.log(`📡 Found additional data characteristic: ${uuid}`);
            break;
          } catch (e) {
            // Continue to next UUID
          }
        }
        
        if (dataCharacteristic) {
          try {
            console.log('📡 Setting up notifications on discovered characteristic...');
            await dataCharacteristic.startNotifications();
            dataCharacteristic.addEventListener('characteristicvaluechanged', onDataReceived);
            console.log('✅ Successfully set up notifications');
          } catch (e) {
            console.warn('⚠️ Failed to setup notifications on discovered characteristic:', e);
            dataCharacteristic = null;
          }
        } else {
          console.warn('⚠️ No suitable characteristic found for data notifications');
        }
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