import { ISensorAdapter, SensorReadingData } from '@/types/sensor';
import { createTimestamp } from '@/utils/timeFormat';
import * as logger from '@/utils/logger';

/**
 * AirBeam2/3 sensor adapter implementing the unified ISensorAdapter interface
 * 
 * OFFICIAL BLE Protocol (Standard 16-bit UUIDs):
 * - Service: 0000FFF0-0000-1000-8000-00805f9b34fb
 * - PM Characteristic (FFF3): 6 bytes - PM1, PM2.5, PM10 (Uint16 LE each)
 * - Env Characteristic (FFF4): 4 bytes - Temp (Int16 LE /100), Humidity (Uint16 LE /100)
 * - Battery Characteristic (FFF6): 1 byte - Battery level %
 */
export class AirBeamAdapter implements ISensorAdapter {
  public readonly sensorId = 'airbeam' as const;
  public readonly name = 'AirBeam';

  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private lastReading: SensorReadingData | null = null;
  private battery: number = 100;
  private charging: number = 0;

  // OFFICIAL AirBeam BLE UUIDs (standard 16-bit format)
  private static readonly SERVICE_UUID = '0000fff0-0000-1000-8000-00805f9b34fb';
  private static readonly PM_CHAR_UUID = '0000fff3-0000-1000-8000-00805f9b34fb';
  private static readonly ENV_CHAR_UUID = '0000fff4-0000-1000-8000-00805f9b34fb';
  private static readonly BATTERY_CHAR_UUID = '0000fff6-0000-1000-8000-00805f9b34fb';

  // Internal state for merging notifications from different characteristics
  private currentPM: { pm1: number; pm25: number; pm10: number } = { pm1: 0, pm25: 0, pm10: 0 };
  private currentEnv: { temp: number; humidity: number } = { temp: 0, humidity: 0 };

  public async requestDevice(): Promise<BluetoothDevice> {
    if (!navigator.bluetooth) {
      throw new Error('Web Bluetooth API is not available');
    }

    try {
      logger.info('🔍 Requesting AirBeam Bluetooth device...');
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: 'AirBeam' }],
        optionalServices: [AirBeamAdapter.SERVICE_UUID],
      });
      
      this.device = device;
      logger.info('📱 AirBeam device found:', device.name);
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
      logger.info('🔌 Connecting to AirBeam device...');
      const server = await device.gatt.connect();
      this.server = server;
      this.device = device;
      logger.info('✅ AirBeam connected');
      return server;
    } catch (error) {
      logger.error('AirBeam connection failed:', error);
      throw new Error('AirBeam: Connection failed');
    }
  }

  public async disconnect(force?: boolean): Promise<boolean> {
    logger.info('🔌 AirBeam disconnect called, force:', force);
    
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }
    
    this.device = null;
    this.server = null;
    this.lastReading = null;
    this.currentPM = { pm1: 0, pm25: 0, pm10: 0 };
    this.currentEnv = { temp: 0, humidity: 0 };
    
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
    
    // CRITICAL: ESP32 stabilization delay - AirBeam needs time after GATT connect
    logger.info('💤 [AirBeam] Stabilization pause (1s) for ESP32...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Verify connection is still active after delay
    if (!server.connected) {
      throw new Error('AirBeam: Disconnected during stabilization. Please retry.');
    }
    logger.info('✅ [AirBeam] Connection stable after delay');
    
    // DIAGNOSTIC: Enumerate ALL GATT services first
    let discoveredServices: string[] = [];
    try {
      logger.info('🔍 [AirBeam] Enumerating ALL GATT services...');
      const allServices = await server.getPrimaryServices();
      logger.info(`📋 [AirBeam] Found ${allServices.length} services:`);
      
      for (const service of allServices) {
        discoveredServices.push(service.uuid);
        logger.info(`  → Service UUID: ${service.uuid}`);
        
        // Try to enumerate characteristics for each service
        try {
          const chars = await service.getCharacteristics();
          for (const char of chars) {
            const props = [];
            if (char.properties.notify) props.push('notify');
            if (char.properties.read) props.push('read');
            if (char.properties.write) props.push('write');
            if (char.properties.writeWithoutResponse) props.push('writeNoResp');
            logger.info(`    → Characteristic: ${char.uuid} [${props.join(', ')}]`);
          }
        } catch (charErr) {
          logger.debug(`    → Could not enumerate characteristics for ${service.uuid}`);
        }
      }
    } catch (enumErr) {
      logger.warn('⚠️ [AirBeam] Could not enumerate services:', enumErr);
    }
    
    try {
      logger.info('🔔 Initializing AirBeam notifications (FFF0 service)...');
      
      // Get the main FFF0 service
      const service = await server.getPrimaryService(AirBeamAdapter.SERVICE_UUID);
      logger.info('✅ Found AirBeam FFF0 service');
      
      // Subscribe to PM characteristic (FFF3) - 6 bytes
      await this.subscribeToPMCharacteristic(service, onDataCallback);
      
      // Subscribe to Environment characteristic (FFF4) - 4 bytes
      await this.subscribeToEnvCharacteristic(service, onDataCallback);
      
      // Read/Subscribe to Battery characteristic (FFF6) - 1 byte
      await this.subscribeToBatteryCharacteristic(service, onBatteryCallback);
      
      logger.info('✅ AirBeam notifications initialized successfully');
    } catch (error) {
      logger.error('AirBeam: initializeNotifications failed:', error);
      
      // Format discovered services for error message
      const servicesListShort = discoveredServices.length > 0
        ? discoveredServices.map(uuid => {
            // Shorten standard 128-bit UUIDs to 16-bit format if possible
            const match = uuid.match(/^0000([0-9a-f]{4})-0000-1000-8000-00805f9b34fb$/i);
            return match ? `0x${match[1].toUpperCase()}` : uuid.substring(0, 8) + '...';
          }).join(', ')
        : 'aucun - Essayez: chrome://bluetooth-internals → Devices → Forget device, puis redémarrez Chrome';
      
      throw new Error(`AirBeam: Service FFF0 introuvable. Services: [${servicesListShort}]`);
    }
  }

  /**
   * Subscribe to PM characteristic (FFF3)
   * Format: 6 bytes, Little Endian
   * - Bytes 0-1: PM1 (Uint16)
   * - Bytes 2-3: PM2.5 (Uint16)
   * - Bytes 4-5: PM10 (Uint16)
   */
  private async subscribeToPMCharacteristic(
    service: BluetoothRemoteGATTService,
    onDataCallback: (data: SensorReadingData) => void
  ): Promise<void> {
    try {
      const pmChar = await service.getCharacteristic(AirBeamAdapter.PM_CHAR_UUID);
      logger.info('✅ Found PM characteristic (FFF3)');
      
      await pmChar.startNotifications();
      pmChar.addEventListener('characteristicvaluechanged', (event: Event) => {
        const target = event.target as BluetoothRemoteGATTCharacteristic;
        const value = target.value;
        if (value && value.byteLength >= 6) {
          this.parsePMData(value, onDataCallback);
        }
      });
      
      // Try initial read
      try {
        const initialValue = await pmChar.readValue();
        if (initialValue.byteLength >= 6) {
          this.parsePMData(initialValue, onDataCallback);
        }
      } catch {
        logger.debug('Could not read initial PM value');
      }
    } catch (error) {
      logger.warn('⚠️ Could not subscribe to PM characteristic:', error);
    }
  }

  /**
   * Subscribe to Environment characteristic (FFF4)
   * Format: 4 bytes, Little Endian
   * - Bytes 0-1: Temperature (Int16, signed for negative temps) / 100.0
   * - Bytes 2-3: Humidity (Uint16) / 100.0
   */
  private async subscribeToEnvCharacteristic(
    service: BluetoothRemoteGATTService,
    onDataCallback: (data: SensorReadingData) => void
  ): Promise<void> {
    try {
      const envChar = await service.getCharacteristic(AirBeamAdapter.ENV_CHAR_UUID);
      logger.info('✅ Found Environment characteristic (FFF4)');
      
      await envChar.startNotifications();
      envChar.addEventListener('characteristicvaluechanged', (event: Event) => {
        const target = event.target as BluetoothRemoteGATTCharacteristic;
        const value = target.value;
        if (value && value.byteLength >= 4) {
          this.parseEnvData(value, onDataCallback);
        }
      });
      
      // Try initial read
      try {
        const initialValue = await envChar.readValue();
        if (initialValue.byteLength >= 4) {
          this.parseEnvData(initialValue, onDataCallback);
        }
      } catch {
        logger.debug('Could not read initial Env value');
      }
    } catch (error) {
      logger.warn('⚠️ Could not subscribe to Environment characteristic:', error);
    }
  }

  /**
   * Subscribe to Battery characteristic (FFF6)
   * Format: 1 byte - Battery level %
   */
  private async subscribeToBatteryCharacteristic(
    service: BluetoothRemoteGATTService,
    onBatteryCallback?: (level: number) => void
  ): Promise<void> {
    try {
      const batteryChar = await service.getCharacteristic(AirBeamAdapter.BATTERY_CHAR_UUID);
      logger.info('✅ Found Battery characteristic (FFF6)');
      
      // Read initial value
      try {
        const value = await batteryChar.readValue();
        if (value.byteLength >= 1) {
          this.battery = value.getUint8(0);
          logger.info(`🔋 AirBeam battery: ${this.battery}%`);
          onBatteryCallback?.(this.battery);
        }
      } catch {
        logger.debug('Could not read battery value');
      }
      
      // Try to subscribe to notifications (may not be supported)
      try {
        await batteryChar.startNotifications();
        batteryChar.addEventListener('characteristicvaluechanged', (event: Event) => {
          const target = event.target as BluetoothRemoteGATTCharacteristic;
          const value = target.value;
          if (value && value.byteLength >= 1) {
            this.battery = value.getUint8(0);
            logger.info(`🔋 AirBeam battery update: ${this.battery}%`);
            onBatteryCallback?.(this.battery);
          }
        });
      } catch {
        logger.debug('Battery characteristic does not support notifications');
      }
    } catch (error) {
      logger.warn('⚠️ Could not access Battery characteristic:', error);
    }
  }

  /**
   * Parse PM data from FFF3 characteristic
   */
  private parsePMData(dataView: DataView, onDataCallback: (data: SensorReadingData) => void): void {
    // Log raw bytes for debugging
    const bytes = [];
    for (let i = 0; i < dataView.byteLength; i++) {
      bytes.push(dataView.getUint8(i).toString(16).padStart(2, '0'));
    }
    logger.info(`📦 AirBeam PM raw bytes: ${bytes.join(' ')}`);
    
    // Parse PM values (Uint16 Little Endian, direct µg/m³)
    const pm1 = dataView.getUint16(0, true);
    const pm25 = dataView.getUint16(2, true);
    const pm10 = dataView.getUint16(4, true);
    
    logger.info(`📊 AirBeam PM parsed: PM1=${pm1}, PM2.5=${pm25}, PM10=${pm10} µg/m³`);
    
    // Update internal state
    this.currentPM = { pm1, pm25, pm10 };
    
    // Emit merged reading
    this.emitReading(onDataCallback);
  }

  /**
   * Parse Environment data from FFF4 characteristic
   */
  private parseEnvData(dataView: DataView, onDataCallback: (data: SensorReadingData) => void): void {
    // Log raw bytes for debugging
    const bytes = [];
    for (let i = 0; i < dataView.byteLength; i++) {
      bytes.push(dataView.getUint8(i).toString(16).padStart(2, '0'));
    }
    logger.info(`📦 AirBeam Env raw bytes: ${bytes.join(' ')}`);
    
    // Parse Temp (Int16 signed for negative temps) / 100.0
    const tempRaw = dataView.getInt16(0, true);
    const temp = tempRaw / 100.0;
    
    // Parse Humidity (Uint16) / 100.0
    const humidityRaw = dataView.getUint16(2, true);
    const humidity = humidityRaw / 100.0;
    
    logger.info(`📊 AirBeam Env parsed: Temp=${temp.toFixed(1)}°C, Humidity=${humidity.toFixed(1)}%`);
    
    // Update internal state
    this.currentEnv = { temp, humidity };
    
    // Emit merged reading
    this.emitReading(onDataCallback);
  }

  /**
   * Emit a complete SensorReadingData by merging PM and Env data
   */
  private emitReading(onDataCallback: (data: SensorReadingData) => void): void {
    const reading: SensorReadingData = {
      pm1: this.currentPM.pm1,
      pm25: this.currentPM.pm25,
      pm10: this.currentPM.pm10,
      temp: this.currentEnv.temp,
      humidity: this.currentEnv.humidity,
      pressure: undefined, // AirBeam doesn't report pressure
      tvoc: undefined, // AirBeam doesn't report TVOC
      battery: this.battery,
      charging: this.charging === 1,
      timestamp: createTimestamp(),
      location: 'AirBeam Device',
    };
    
    this.lastReading = reading;
    onDataCallback(reading);
    
    logger.info('📤 AirBeam complete reading emitted:', {
      pm1: reading.pm1,
      pm25: reading.pm25,
      pm10: reading.pm10,
      temp: reading.temp,
      humidity: reading.humidity,
      battery: reading.battery
    });
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

  /**
   * AirBeam doesn't support pressure sensor
   */
  public supportsPressure(): boolean {
    return false;
  }

  /**
   * AirBeam doesn't support TVOC sensor
   */
  public supportsTVOC(): boolean {
    return false;
  }
}

// Export singleton instance
export const airBeamAdapter = new AirBeamAdapter();
