import { ISensorAdapter, SensorReadingData } from '@/types/sensor';
import { createTimestamp } from '@/utils/timeFormat';
import * as logger from '@/utils/logger';

/**
 * AirBeam sensor adapter implementing the unified ISensorAdapter interface
 * AirBeam supports: PM2.5, PM10, Temperature, Humidity, Pressure
 * Note: AirBeam does NOT report PM1 or TVOC
 */
export class AirBeamAdapter implements ISensorAdapter {
  public readonly sensorId = 'airbeam' as const;
  public readonly name = 'AirBeam';

  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private lastReading: SensorReadingData | null = null;
  private battery: number = 0;
  private charging: number = 0;

  // AirBeam GATT UUIDs - Generic environmental sensing service
  private static readonly AIRBEAM_SERVICE_UUID = '0000181a-0000-1000-8000-00805f9b34fb';
  private static readonly AIRBEAM_DATA_CHAR_UUID = '00002a6e-0000-1000-8000-00805f9b34fb'; // Temperature characteristic

  public async requestDevice(): Promise<BluetoothDevice> {
    if (!navigator.bluetooth) {
      throw new Error('Web Bluetooth API is not available');
    }

    try {
      logger.debug('🔍 Requesting AirBeam Bluetooth device...');
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: 'AirBeam' },
        ],
        optionalServices: [AirBeamAdapter.AIRBEAM_SERVICE_UUID],
      });
      
      this.device = device;
      logger.debug('📱 AirBeam device found:', device.name);
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
      logger.debug('🔌 Connecting to AirBeam device...');
      const server = await device.gatt.connect();
      this.server = server;
      this.device = device;
      logger.debug('✅ AirBeam connected');
      return server;
    } catch (error) {
      logger.error('AirBeam connection failed:', error);
      throw new Error('AirBeam: Connection failed');
    }
  }

  public async disconnect(force?: boolean): Promise<boolean> {
    logger.debug('🔌 AirBeam disconnect called, force:', force);
    
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
      logger.debug('🔔 Initializing AirBeam notifications...');
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
      
      logger.debug('✅ AirBeam notifications initialized');
    } catch (error) {
      logger.error('AirBeam: initializeNotifications failed:', error);
      throw new Error('AirBeam: Notification initialization failed');
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
   * AirBeam payload structure (20 bytes expected):
   * - Bytes 0-3: PM2.5 (float32, little-endian)
   * - Bytes 4-7: PM10 (float32, little-endian)
   * - Bytes 8-11: Temperature in Celsius (float32, little-endian)
   * - Bytes 12-15: Humidity in % (float32, little-endian)
   * - Bytes 16-19: Pressure in hPa (float32, little-endian)
   * 
   * Note: PM1 is NOT available on AirBeam, set to 0
   * Note: TVOC is NOT available on AirBeam, set to undefined
   */
  private parseAirBeamData(rawData: DataView): SensorReadingData | null {
    try {
      // Validate minimum data length
      if (rawData.byteLength < 20) {
        logger.warn('AirBeam: Data packet too short:', rawData.byteLength);
        return null;
      }

      const pm25 = rawData.getFloat32(0, true);
      const pm10 = rawData.getFloat32(4, true);
      const temp = rawData.getFloat32(8, true);
      const humidity = rawData.getFloat32(12, true);
      const pressure = rawData.getFloat32(16, true);

      // Validate data ranges
      if (pm25 < 0 || pm25 > 1000 || pm10 < 0 || pm10 > 1000) {
        logger.warn('AirBeam: PM values out of range');
        return null;
      }

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
        timestamp: createTimestamp(),
        location: 'AirBeam Device',
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

  /**
   * AirBeam supports Pressure
   */
  public supportsPressure(): boolean {
    return true;
  }

  /**
   * AirBeam does NOT support TVOC
   */
  public supportsTVOC(): boolean {
    return false;
  }
}

// Export singleton instance
export const airBeamAdapter = new AirBeamAdapter();
