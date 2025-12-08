import { ISensorAdapter, SensorReadingData } from '@/types/sensor';
import { createTimestamp } from '@/utils/timeFormat';
import * as logger from '@/utils/logger';

/**
 * Atmotube PRO 2 sensor adapter implementing the unified ISensorAdapter interface
 * Based on official Android SDK: https://github.com/AToM/atmotube-pro2-android
 * 
 * Atmotube PRO 2 supports: PM1, PM2.5, PM10, Temperature, Humidity, Pressure, VOC, Battery
 */
export class AtmotubeAdapter implements ISensorAdapter {
  public readonly sensorId = 'atmotube' as const;
  public readonly name = 'Atmotube Pro';

  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private lastReading: SensorReadingData | null = null;
  private battery: number = 0;
  private charging: number = 0;

  // Données partielles (fusionnées des 2 caractéristiques)
  private partialData: {
    temp?: number;
    humidity?: number;
    pressure?: number;
    voc?: number;
    pm1?: number;
    pm25?: number;
    pm10?: number;
  } = {};

  // ===== OFFICIAL Atmotube PRO 2 UUIDs from GitHub =====
  // Source: https://github.com/AToM/atmotube-pro2-android
  private static readonly ATMOTUBE_SERVICE_UUID = 'bda3c091-e5e0-4dac-8170-7fcef187a1d0';
  private static readonly ATMOTUBE_DATA_CHAR_UUID = 'bda3c092-e5e0-4dac-8170-7fcef187a1d0'; // Temp, Hum, Press, VOC, Battery
  private static readonly ATMOTUBE_PM_CHAR_UUID = 'bda3c093-e5e0-4dac-8170-7fcef187a1d0';   // PM1, PM2.5, PM10

  public async requestDevice(): Promise<BluetoothDevice> {
    if (!navigator.bluetooth) {
      throw new Error('Web Bluetooth API is not available');
    }

    try {
      console.log('🔍 Requesting Atmotube Bluetooth device...');
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: 'Atmotube' }],
        optionalServices: [AtmotubeAdapter.ATMOTUBE_SERVICE_UUID],
      });
      
      this.device = device;
      console.log('📱 Atmotube device found:', device.name);
      return device;
    } catch (error) {
      console.error('Atmotube device request failed:', error);
      throw new Error('Atmotube: Device request failed');
    }
  }

  public async connect(device: BluetoothDevice): Promise<BluetoothRemoteGATTServer> {
    if (!device.gatt) {
      throw new Error('Atmotube: GATT server not available');
    }

    try {
      console.log('🔌 Connecting to Atmotube device...');
      const server = await device.gatt.connect();
      this.server = server;
      this.device = device;
      console.log('✅ Atmotube connected');
      return server;
    } catch (error) {
      console.error('Atmotube connection failed:', error);
      throw new Error('Atmotube: Connection failed');
    }
  }

  public async disconnect(force?: boolean): Promise<boolean> {
    console.log('🔌 Atmotube disconnect called, force:', force);
    
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }
    
    this.device = null;
    this.server = null;
    this.lastReading = null;
    this.partialData = {};
    
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
      console.log('🔔 Initializing Atmotube notifications...');
      console.log('📡 Looking for service:', AtmotubeAdapter.ATMOTUBE_SERVICE_UUID);
      
      // Découverte de debug - liste tous les services
      await this.discoverAllServices(server);
      
      const service = await server.getPrimaryService(AtmotubeAdapter.ATMOTUBE_SERVICE_UUID);
      console.log('✅ Found Atmotube service!');
      
      // S'abonner aux deux caractéristiques
      await this.subscribeToDataCharacteristic(service, onDataCallback, onBatteryCallback);
      await this.subscribeToPMCharacteristic(service, onDataCallback);
      
      console.log('✅ Atmotube notifications initialized (DATA + PM)');
    } catch (error) {
      console.error('Atmotube: initializeNotifications failed:', error);
      throw new Error('Atmotube: Notification initialization failed - ' + (error as Error).message);
    }
  }

  /**
   * Debug: Discover and log all GATT services on the device
   */
  private async discoverAllServices(server: BluetoothRemoteGATTServer): Promise<void> {
    try {
      console.log('🔍 DISCOVERING ALL GATT SERVICES...');
      const services = await server.getPrimaryServices();
      for (const service of services) {
        console.log(`📡 Service UUID: ${service.uuid}`);
        try {
          const chars = await service.getCharacteristics();
          for (const char of chars) {
            const props = [];
            if (char.properties.notify) props.push('NOTIFY');
            if (char.properties.read) props.push('READ');
            if (char.properties.write) props.push('WRITE');
            console.log(`   └── Characteristic: ${char.uuid} [${props.join(', ')}]`);
          }
        } catch (e) {
          console.log(`   └── Could not enumerate characteristics`);
        }
      }
    } catch (e) {
      console.warn('Could not discover services:', e);
    }
  }

  /**
   * Subscribe to DATA characteristic (Temp, Humidity, Pressure, VOC, Battery)
   * Format: 16 bytes
   */
  private async subscribeToDataCharacteristic(
    service: BluetoothRemoteGATTService,
    onDataCallback: (data: SensorReadingData) => void,
    onBatteryCallback?: (level: number) => void
  ): Promise<void> {
    console.log('📡 Subscribing to DATA characteristic:', AtmotubeAdapter.ATMOTUBE_DATA_CHAR_UUID);
    const dataChar = await service.getCharacteristic(AtmotubeAdapter.ATMOTUBE_DATA_CHAR_UUID);
    
    await dataChar.startNotifications();
    dataChar.addEventListener('characteristicvaluechanged', (event: Event) => {
      const target = event.target as BluetoothRemoteGATTCharacteristic;
      const value = target.value;
      if (value) {
        this.parseDataCharacteristic(value, onBatteryCallback);
        this.tryEmitCompleteReading(onDataCallback);
      }
    });
    console.log('✅ Subscribed to DATA characteristic');
  }

  /**
   * Subscribe to PM characteristic (PM1, PM2.5, PM10)
   * Format: 6 bytes
   */
  private async subscribeToPMCharacteristic(
    service: BluetoothRemoteGATTService,
    onDataCallback: (data: SensorReadingData) => void
  ): Promise<void> {
    console.log('📡 Subscribing to PM characteristic:', AtmotubeAdapter.ATMOTUBE_PM_CHAR_UUID);
    const pmChar = await service.getCharacteristic(AtmotubeAdapter.ATMOTUBE_PM_CHAR_UUID);
    
    await pmChar.startNotifications();
    pmChar.addEventListener('characteristicvaluechanged', (event: Event) => {
      const target = event.target as BluetoothRemoteGATTCharacteristic;
      const value = target.value;
      if (value) {
        this.parsePMCharacteristic(value);
        this.tryEmitCompleteReading(onDataCallback);
      }
    });
    console.log('✅ Subscribed to PM characteristic');
  }

  /**
   * Parse DATA characteristic (16 bytes)
   * Based on official Android SDK:
   * - Bytes 0-1: Temperature (Int16, scaled by 100)
   * - Bytes 2-3: Humidity (Int16, scaled by 100)
   * - Bytes 4-7: Pressure (Int32, in Pa, divide by 100 for hPa)
   * - Bytes 8-9: VOC Index (Uint16)
   * - Bytes 10-11: NOx Index (Uint16) - not used
   * - Bytes 12-13: CO2 (Uint16) - not used
   * - Bytes 14: Battery level (0-100)
   * - Byte 15: Flags
   */
  private parseDataCharacteristic(rawData: DataView, onBatteryCallback?: (level: number) => void): void {
    try {
      console.log('📊 Parsing DATA characteristic, length:', rawData.byteLength);
      this.logRawData('DATA', rawData);
      
      if (rawData.byteLength < 15) {
        console.warn('Atmotube: DATA packet too short:', rawData.byteLength);
        return;
      }

      // Temperature: Int16 / 100
      const tempRaw = rawData.getInt16(0, true);
      this.partialData.temp = tempRaw / 100.0;

      // Humidity: Int16 / 100
      const humRaw = rawData.getInt16(2, true);
      this.partialData.humidity = humRaw / 100.0;

      // Pressure: Int32 in Pa, convert to hPa
      const pressRaw = rawData.getInt32(4, true);
      this.partialData.pressure = pressRaw / 100.0;

      // VOC Index: Uint16
      this.partialData.voc = rawData.getUint16(8, true);

      // Battery level: Byte at offset 14
      if (rawData.byteLength >= 15) {
        this.battery = rawData.getUint8(14);
        onBatteryCallback?.(this.battery);
      }

      console.log('📊 DATA parsed:', {
        temp: this.partialData.temp,
        humidity: this.partialData.humidity,
        pressure: this.partialData.pressure,
        voc: this.partialData.voc,
        battery: this.battery
      });
    } catch (error) {
      console.warn('Atmotube: DATA parsing failed', error);
    }
  }

  /**
   * Parse PM characteristic (6 bytes)
   * Based on official Android SDK:
   * - Bytes 0-1: PM1 (Uint16, bit 15 = flag, bits 0-14 = value)
   * - Bytes 2-3: PM2.5 (Uint16, bit 15 = flag, bits 0-14 = value)
   * - Bytes 4-5: PM10 (Uint16, bit 15 = flag, bits 0-14 = value)
   */
  private parsePMCharacteristic(rawData: DataView): void {
    try {
      console.log('📊 Parsing PM characteristic, length:', rawData.byteLength);
      this.logRawData('PM', rawData);
      
      if (rawData.byteLength < 6) {
        console.warn('Atmotube: PM packet too short:', rawData.byteLength);
        return;
      }

      // PM values use bit 15 as a flag, bits 0-14 for the actual value
      const pm1Raw = rawData.getUint16(0, true);
      const pm25Raw = rawData.getUint16(2, true);
      const pm10Raw = rawData.getUint16(4, true);

      // Mask out bit 15 to get actual PM values
      this.partialData.pm1 = pm1Raw & 0x7FFF;
      this.partialData.pm25 = pm25Raw & 0x7FFF;
      this.partialData.pm10 = pm10Raw & 0x7FFF;

      console.log('📊 PM parsed:', {
        pm1: this.partialData.pm1,
        pm25: this.partialData.pm25,
        pm10: this.partialData.pm10
      });
    } catch (error) {
      console.warn('Atmotube: PM parsing failed', error);
    }
  }

  /**
   * Log raw data in hex for debugging
   */
  private logRawData(label: string, dataView: DataView): void {
    const bytes = [];
    for (let i = 0; i < dataView.byteLength; i++) {
      bytes.push(dataView.getUint8(i).toString(16).padStart(2, '0'));
    }
    console.log(`🔢 ${label} raw bytes:`, bytes.join(' '));
  }

  /**
   * Try to emit a complete reading when both DATA and PM are available
   */
  private tryEmitCompleteReading(onDataCallback: (data: SensorReadingData) => void): void {
    const { temp, humidity, pressure, voc, pm1, pm25, pm10 } = this.partialData;

    // Check if we have all PM data (minimum required)
    if (pm1 === undefined || pm25 === undefined || pm10 === undefined) {
      return;
    }

    const reading: SensorReadingData = {
      pm1,
      pm25,
      pm10,
      temp: temp ?? 0,
      humidity: humidity ?? 0,
      pressure,
      tvoc: voc,
      battery: this.battery,
      charging: this.charging === 1,
      timestamp: createTimestamp(),
      location: 'Atmotube Pro',
    };

    this.lastReading = reading;
    onDataCallback(reading);
    
    console.log('📤 Complete reading emitted:', reading);
  }

  public updateBattery(level: number): void {
    this.battery = level;
  }

  public updateCharging(status: number): void {
    this.charging = status;
  }

  public getBattery(): number {
    return this.battery;
  }

  public isCharging(): boolean {
    return this.charging === 1;
  }

  public supportsTVOC(): boolean {
    return true;
  }

  public supportsPressure(): boolean {
    return true;
  }
}

// Export singleton instance
export const atmotubeAdapter = new AtmotubeAdapter();
