import { ISensorAdapter, SensorReadingData } from '@/types/sensor';
import { createTimestamp } from '@/utils/timeFormat';
import * as logger from '@/utils/logger';

/**
 * Atmotube Pro sensor adapter implementing the unified ISensorAdapter interface
 * Atmotube Pro supports: PM1, PM2.5, PM10, Temperature, Humidity, Pressure, TVOC
 * This is the most complete sensor supporting all environmental parameters
 */
export class AtmotubeAdapter implements ISensorAdapter {
  public readonly sensorId = 'atmotube' as const;
  public readonly name = 'Atmotube Pro';

  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private lastReading: SensorReadingData | null = null;
  private battery: number = 0;
  private charging: number = 0;

  // Atmotube Pro GATT UUIDs (Private Atmotube service)
  private static readonly ATMOTUBE_SERVICE_UUID = '4b13a770-4ccb-11e5-a151-0002a5d5c51b';
  private static readonly ATMOTUBE_MEASURE_CHAR_UUID = '0000a770-4ccb-11e5-a151-0002a5d5c51b';

  public async requestDevice(): Promise<BluetoothDevice> {
    if (!navigator.bluetooth) {
      throw new Error('Web Bluetooth API is not available');
    }

    try {
      logger.debug('🔍 Requesting Atmotube Bluetooth device...');
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: [AtmotubeAdapter.ATMOTUBE_SERVICE_UUID] },
        ],
        optionalServices: [AtmotubeAdapter.ATMOTUBE_SERVICE_UUID],
      });
      
      this.device = device;
      logger.debug('📱 Atmotube device found:', device.name);
      return device;
    } catch (error) {
      logger.error('Atmotube device request failed:', error);
      throw new Error('Atmotube: Device request failed');
    }
  }

  public async connect(device: BluetoothDevice): Promise<BluetoothRemoteGATTServer> {
    if (!device.gatt) {
      throw new Error('Atmotube: GATT server not available');
    }

    try {
      logger.debug('🔌 Connecting to Atmotube device...');
      const server = await device.gatt.connect();
      this.server = server;
      this.device = device;
      logger.debug('✅ Atmotube connected');
      return server;
    } catch (error) {
      logger.error('Atmotube connection failed:', error);
      throw new Error('Atmotube: Connection failed');
    }
  }

  public async disconnect(force?: boolean): Promise<boolean> {
    logger.debug('🔌 Atmotube disconnect called, force:', force);
    
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
      logger.debug('🔔 Initializing Atmotube notifications...');
      const service = await server.getPrimaryService(AtmotubeAdapter.ATMOTUBE_SERVICE_UUID);
      const measureChar = await service.getCharacteristic(AtmotubeAdapter.ATMOTUBE_MEASURE_CHAR_UUID);
      
      await measureChar.startNotifications();
      measureChar.addEventListener('characteristicvaluechanged', (event: Event) => {
        const target = event.target as BluetoothRemoteGATTCharacteristic;
        const value = target.value;
        if (value) {
          const data = this.parseAtmotubeData(value);
          if (data) {
            this.lastReading = data;
            onDataCallback(data);
          }
        }
      });
      
      logger.debug('✅ Atmotube notifications initialized');
    } catch (error) {
      logger.error('Atmotube: initializeNotifications failed:', error);
      throw new Error('Atmotube: Notification initialization failed');
    }
  }

  public updateBattery(level: number): void {
    this.battery = level;
  }

  public updateCharging(status: number): void {
    this.charging = status;
  }

  /**
   * Parse Atmotube Pro-specific data format into unified SensorReadingData
   * Atmotube Pro payload structure (28 bytes expected):
   * - Bytes 0-3: PM1 (float32, little-endian)
   * - Bytes 4-7: PM2.5 (float32, little-endian)
   * - Bytes 8-11: PM10 (float32, little-endian)
   * - Bytes 12-15: Temperature in Celsius (float32, little-endian)
   * - Bytes 16-19: Humidity in % (float32, little-endian)
   * - Bytes 20-23: Pressure in hPa (float32, little-endian)
   * - Bytes 24-27: TVOC index (float32, little-endian)
   */
  private parseAtmotubeData(rawData: DataView): SensorReadingData | null {
    try {
      // Validate minimum data length
      if (rawData.byteLength < 28) {
        logger.warn('Atmotube: Data packet too short:', rawData.byteLength);
        return null;
      }

      const pm1 = rawData.getFloat32(0, true);
      const pm25 = rawData.getFloat32(4, true);
      const pm10 = rawData.getFloat32(8, true);
      const temp = rawData.getFloat32(12, true);
      const humidity = rawData.getFloat32(16, true);
      const pressure = rawData.getFloat32(20, true);
      const tvoc = rawData.getFloat32(24, true);

      // Validate data ranges
      if (pm1 < 0 || pm1 > 1000 || pm25 < 0 || pm25 > 1000 || pm10 < 0 || pm10 > 1000) {
        logger.warn('Atmotube: PM values out of range');
        return null;
      }

      return {
        pm1,
        pm25,
        pm10,
        temp,
        humidity,
        pressure,
        tvoc,
        battery: this.battery,
        charging: this.charging === 1,
        timestamp: createTimestamp(),
        location: 'Atmotube Pro',
      };
    } catch (error) {
      logger.warn('Atmotube: Data parsing failed', error);
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
   * Atmotube Pro supports TVOC
   */
  public supportsTVOC(): boolean {
    return true;
  }

  /**
   * Atmotube Pro supports Pressure
   */
  public supportsPressure(): boolean {
    return true;
  }
}

// Export singleton instance
export const atmotubeAdapter = new AtmotubeAdapter();
