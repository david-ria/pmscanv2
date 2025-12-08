import { ISensorAdapter, SensorReadingData } from '@/types/sensor';
import * as logger from '@/utils/logger';

/**
 * AirBeam sensor adapter implementing the unified ISensorAdapter interface
 * AirBeam supports: PM2.5, PM10, Temperature, Humidity, Pressure
 */
export class AirBeamAdapter implements ISensorAdapter {
  public readonly sensorId = 'airbeam' as const;
  public readonly name = 'AirBeam';

  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private lastReading: SensorReadingData | null = null;
  private battery: number = 0;
  private charging: number = 0;

  // AirBeam GATT UUIDs
  private static readonly AIRBEAM_SERVICE_UUID = '0000181a-0000-1000-8000-00805f9b34fb';
  private static readonly AIRBEAM_DATA_CHAR_UUID = 'c8e03290-a359-11e5-9f5e-0002a5d5c51b';

  public async requestDevice(): Promise<BluetoothDevice> {
    if (!navigator.bluetooth) {
      throw new Error('Web Bluetooth API is not available');
    }

    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: [AirBeamAdapter.AIRBEAM_SERVICE_UUID] },
        ],
        optionalServices: [AirBeamAdapter.AIRBEAM_SERVICE_UUID],
      });
      
      this.device = device;
      return device;
    } catch (error) {
      logger.error('AirBeam device request failed:', error);
      throw new Error('AirBeam: Device request failed');
    }
  }

  public async connect(device: BluetoothDevice): Promise<BluetoothRemoteGATTServer> {
    if (!device.gatt) {
      throw new Error('AirBeam: GATT server not available');
    }

    try {
      const server = await device.gatt.connect();
      this.server = server;
      this.device = device;
      return server;
    } catch (error) {
      logger.error('AirBeam connection failed:', error);
      throw new Error('AirBeam: Connection failed');
    }
  }

  public async disconnect(force?: boolean): Promise<boolean> {
    logger.debug('AirBeam disconnect called, force:', force);
    
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }
    
    this.device = null;
    this.server = null;
    this.lastReading = null;
    
    return true;
  }

  public getLiveReading(): SensorReadingData | null {
    return this.lastReading;
  }

  public async initializeNotifications(
    server: BluetoothRemoteGATTServer,
    device: BluetoothDevice,
    onDataCallback: (data: SensorReadingData) => void,
    onBatteryCallback?: (level: number) => void
  ): Promise<void> {
    this.server = server;
    this.device = device;
    
    try {
      const service = await server.getPrimaryService(AirBeamAdapter.AIRBEAM_SERVICE_UUID);
      const dataChar = await service.getCharacteristic(AirBeamAdapter.AIRBEAM_DATA_CHAR_UUID);
      
      await dataChar.startNotifications();
      dataChar.addEventListener('characteristicvaluechanged', (event: Event) => {
        const target = event.target as BluetoothRemoteGATTCharacteristic;
        const value = target.value;
        if (value) {
          const data = this.parseAirBeamData(value);
          if (data) {
            this.lastReading = data;
            onDataCallback(data);
          }
        }
      });
      
      logger.debug('AirBeam: Notifications initialized');
    } catch (error) {
      logger.warn('AirBeam: initializeNotifications failed - sensor not fully supported yet', error);
      throw new Error('AirBeam: Notification initialization not implemented');
    }
  }

  public updateBattery(level: number): void {
    this.battery = level;
  }

  public updateCharging(status: number): void {
    this.charging = status;
  }

  /**
   * Parse AirBeam-specific data format into unified SensorReadingData
   * AirBeam reports: PM2.5, PM10, Temperature, Humidity, Pressure
   * Note: PM1 is not available on AirBeam, set to 0
   */
  private parseAirBeamData(rawData: DataView): SensorReadingData | null {
    try {
      // AirBeam data format (placeholder - needs real protocol documentation)
      // This is a skeleton implementation
      const pm25 = rawData.getFloat32(0, true);
      const pm10 = rawData.getFloat32(4, true);
      const temp = rawData.getFloat32(8, true);
      const humidity = rawData.getFloat32(12, true);
      const pressure = rawData.getFloat32(16, true);

      return {
        pm1: 0, // AirBeam doesn't report PM1
        pm25,
        pm10,
        temp,
        humidity,
        pressure,
        tvoc: undefined, // AirBeam doesn't support TVOC
        battery: this.battery,
        charging: this.charging === 1,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.warn('AirBeam: Data parsing failed', error);
      return null;
    }
  }

  /**
   * Get current battery level
   */
  public getBattery(): number {
    return this.battery;
  }

  /**
   * Check if charging
   */
  public isCharging(): boolean {
    return this.charging === 1;
  }
}

// Export singleton instance
export const airBeamAdapter = new AirBeamAdapter();
