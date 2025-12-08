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

  // Atmotube Pro GATT UUIDs (Official from documentation)
  private static readonly ATMOTUBE_SERVICE_UUID = 'db450001-8e9a-4818-add7-6ed94a328ab4';
  private static readonly ATMOTUBE_VOC_CHAR_UUID = 'db450002-8e9a-4818-add7-6ed94a328ab4';
  private static readonly ATMOTUBE_BME_CHAR_UUID = 'db450003-8e9a-4818-add7-6ed94a328ab4';
  private static readonly ATMOTUBE_STATUS_CHAR_UUID = 'db450004-8e9a-4818-add7-6ed94a328ab4';
  private static readonly ATMOTUBE_PM_CHAR_UUID = 'db450005-8e9a-4818-add7-6ed94a328ab4';

  public async requestDevice(): Promise<BluetoothDevice> {
    if (!navigator.bluetooth) {
      throw new Error('Web Bluetooth API is not available');
    }

    try {
      logger.debug('🔍 Requesting Atmotube Bluetooth device...');
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: 'ATMOTUBE' },
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
      
      // PM characteristic (PM1, PM2.5, PM10)
      const pmChar = await service.getCharacteristic(AtmotubeAdapter.ATMOTUBE_PM_CHAR_UUID);
      await pmChar.startNotifications();
      pmChar.addEventListener('characteristicvaluechanged', (event: Event) => {
        const target = event.target as BluetoothRemoteGATTCharacteristic;
        const value = target.value;
        if (value) {
          this.parsePMData(value);
          this.emitReading(onDataCallback);
        }
      });
      
      // BME280 characteristic (Temperature, Humidity, Pressure)
      const bmeChar = await service.getCharacteristic(AtmotubeAdapter.ATMOTUBE_BME_CHAR_UUID);
      await bmeChar.startNotifications();
      bmeChar.addEventListener('characteristicvaluechanged', (event: Event) => {
        const target = event.target as BluetoothRemoteGATTCharacteristic;
        const value = target.value;
        if (value) {
          this.parseBMEData(value);
        }
      });
      
      // VOC characteristic
      const vocChar = await service.getCharacteristic(AtmotubeAdapter.ATMOTUBE_VOC_CHAR_UUID);
      await vocChar.startNotifications();
      vocChar.addEventListener('characteristicvaluechanged', (event: Event) => {
        const target = event.target as BluetoothRemoteGATTCharacteristic;
        const value = target.value;
        if (value) {
          this.parseVOCData(value);
        }
      });
      
      // Status characteristic (Battery)
      try {
        const statusChar = await service.getCharacteristic(AtmotubeAdapter.ATMOTUBE_STATUS_CHAR_UUID);
        await statusChar.startNotifications();
        statusChar.addEventListener('characteristicvaluechanged', (event: Event) => {
          const target = event.target as BluetoothRemoteGATTCharacteristic;
          const value = target.value;
          if (value && value.byteLength >= 1) {
            this.battery = value.getUint8(0);
            if (onBatteryCallback) onBatteryCallback(this.battery);
          }
        });
      } catch (e) {
        logger.warn('Atmotube: Status characteristic not available');
      }
      
      logger.debug('✅ Atmotube notifications initialized');
    } catch (error) {
      logger.error('Atmotube: initializeNotifications failed:', error);
      throw new Error('Atmotube: Notification initialization failed');
    }
  }
  
  // Temporary storage for partial readings
  private pmValues = { pm1: 0, pm25: 0, pm10: 0 };
  private bmeValues = { temp: 0, humidity: 0, pressure: 0 };
  private vocValue = 0;
  
  private parsePMData(rawData: DataView): void {
    try {
      // Atmotube PM format: 3 bytes each for PM1, PM2.5, PM10 (little-endian, divide by 100)
      if (rawData.byteLength >= 9) {
        const pm1Raw = rawData.getUint8(0) | (rawData.getUint8(1) << 8) | (rawData.getUint8(2) << 16);
        const pm25Raw = rawData.getUint8(3) | (rawData.getUint8(4) << 8) | (rawData.getUint8(5) << 16);
        const pm10Raw = rawData.getUint8(6) | (rawData.getUint8(7) << 8) | (rawData.getUint8(8) << 16);
        
        this.pmValues.pm1 = pm1Raw / 100;
        this.pmValues.pm25 = pm25Raw / 100;
        this.pmValues.pm10 = pm10Raw / 100;
      }
    } catch (error) {
      logger.warn('Atmotube: PM parsing failed', error);
    }
  }
  
  private parseBMEData(rawData: DataView): void {
    try {
      // BME280: 1 byte temp (-40 offset), 1 byte humidity, 4 bytes pressure (little-endian, /100)
      if (rawData.byteLength >= 6) {
        this.bmeValues.temp = rawData.getUint8(0) - 40;
        this.bmeValues.humidity = rawData.getUint8(1);
        this.bmeValues.pressure = rawData.getUint32(2, true) / 100;
      }
    } catch (error) {
      logger.warn('Atmotube: BME parsing failed', error);
    }
  }
  
  private parseVOCData(rawData: DataView): void {
    try {
      // VOC: 2 bytes little-endian (ppb)
      if (rawData.byteLength >= 2) {
        this.vocValue = rawData.getUint16(0, true);
      }
    } catch (error) {
      logger.warn('Atmotube: VOC parsing failed', error);
    }
  }
  
  private emitReading(onDataCallback: (data: SensorReadingData) => void): void {
    const data: SensorReadingData = {
      pm1: this.pmValues.pm1,
      pm25: this.pmValues.pm25,
      pm10: this.pmValues.pm10,
      temp: this.bmeValues.temp,
      humidity: this.bmeValues.humidity,
      pressure: this.bmeValues.pressure,
      tvoc: this.vocValue,
      battery: this.battery,
      charging: this.charging === 1,
      timestamp: createTimestamp(),
      location: 'Atmotube Pro',
    };
    
    this.lastReading = data;
    onDataCallback(data);
  }

  public updateBattery(level: number): void {
    this.battery = level;
  }

  public updateCharging(status: number): void {
    this.charging = status;
  }

  // Legacy method kept for compatibility - now uses separate characteristic parsing
  private parseAtmotubeData(rawData: DataView): SensorReadingData | null {
    // This method is no longer used - data comes from separate characteristics
    logger.warn('Atmotube: Legacy parseAtmotubeData called');
    return this.lastReading;
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
