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
      
      // Découverte de debug - liste tous les services disponibles
      const discoveredServices = await this.discoverAllServices(server);
      
      // Essayer de trouver le service Atmotube
      let service: BluetoothRemoteGATTService | null = null;
      
      try {
        service = await server.getPrimaryService(AtmotubeAdapter.ATMOTUBE_SERVICE_UUID);
        console.log('✅ Found Atmotube service via direct UUID!');
      } catch (directError) {
        console.warn('⚠️ Direct service lookup failed, trying discovered services...');
        
        // Fallback: chercher dans les services découverts
        for (const svc of discoveredServices) {
          const uuid = svc.uuid.toLowerCase();
          console.log('🔍 Checking discovered service:', uuid);
          
          // Chercher un match partiel sur le UUID Atmotube
          if (uuid.includes('bda3c091') || uuid === AtmotubeAdapter.ATMOTUBE_SERVICE_UUID) {
            service = svc;
            console.log('✅ Found Atmotube service in discovered list!');
            break;
          }
        }
      }
      
      if (!service) {
        // Si toujours pas trouvé, essayer avec le premier service qui a des caractéristiques notifiables
        console.log('⚠️ Atmotube service not found, trying fallback with first notifiable service...');
        for (const svc of discoveredServices) {
          try {
            const chars = await svc.getCharacteristics();
            const notifiableChars = chars.filter(c => c.properties.notify);
            if (notifiableChars.length >= 2) {
              console.log(`📡 Found service with ${notifiableChars.length} notifiable characteristics:`, svc.uuid);
              service = svc;
              break;
            }
          } catch (e) {
            // Continue
          }
        }
      }
      
      if (!service) {
        throw new Error('Atmotube service not found on device. Available services: ' + 
          discoveredServices.map(s => s.uuid).join(', '));
      }
      
      // S'abonner aux caractéristiques
      await this.subscribeToCharacteristics(service, onDataCallback, onBatteryCallback);
      
      console.log('✅ Atmotube notifications initialized');
    } catch (error) {
      console.error('❌ Atmotube: initializeNotifications failed:', error);
      throw new Error('Atmotube: Notification initialization failed - ' + (error as Error).message);
    }
  }

  /**
   * Subscribe to available characteristics on the service
   */
  private async subscribeToCharacteristics(
    service: BluetoothRemoteGATTService,
    onDataCallback: (data: SensorReadingData) => void,
    onBatteryCallback?: (level: number) => void
  ): Promise<void> {
    const chars = await service.getCharacteristics();
    console.log(`📡 Found ${chars.length} characteristics on service ${service.uuid}`);
    
    for (const char of chars) {
      const props = [];
      if (char.properties.notify) props.push('NOTIFY');
      if (char.properties.read) props.push('READ');
      if (char.properties.write) props.push('WRITE');
      console.log(`   └── ${char.uuid} [${props.join(', ')}]`);
    }
    
    // Essayer d'abord les UUIDs officiels
    let dataCharFound = false;
    let pmCharFound = false;
    
    for (const char of chars) {
      const uuid = char.uuid.toLowerCase();
      
      if (uuid.includes('bda3c092') || uuid === AtmotubeAdapter.ATMOTUBE_DATA_CHAR_UUID) {
        console.log('✅ Found DATA characteristic:', uuid);
        await this.setupDataNotification(char, onDataCallback, onBatteryCallback);
        dataCharFound = true;
      } else if (uuid.includes('bda3c093') || uuid === AtmotubeAdapter.ATMOTUBE_PM_CHAR_UUID) {
        console.log('✅ Found PM characteristic:', uuid);
        await this.setupPMNotification(char, onDataCallback);
        pmCharFound = true;
      }
    }
    
    // Fallback: s'abonner à tous les caractéristiques notifiables
    if (!dataCharFound || !pmCharFound) {
      console.log('⚠️ Official characteristics not found, subscribing to all notifiable chars...');
      let charIndex = 0;
      for (const char of chars) {
        if (char.properties.notify) {
          console.log(`📡 Subscribing to characteristic ${charIndex}:`, char.uuid);
          await char.startNotifications();
          char.addEventListener('characteristicvaluechanged', (event: Event) => {
            const target = event.target as BluetoothRemoteGATTCharacteristic;
            const value = target.value;
            if (value) {
              console.log(`📦 Data from char ${char.uuid}, length: ${value.byteLength}`);
              this.logRawData(char.uuid, value);
              
              // Parse based on characteristic UUID and size
              const uuid = char.uuid.toLowerCase();
              
              if (uuid.includes('db450005') && value.byteLength >= 6) {
                // db450005 = PM data (12 bytes: 6 bytes PM + 6 bytes particle counts)
                this.parsePMCharacteristic(value);
                this.tryEmitCompleteReading(onDataCallback);
              } else if (uuid.includes('db450003') && value.byteLength >= 8) {
                // db450003 = Environmental data (temp, humidity, etc.)
                this.parseEnvironmentalCharacteristic(value, onBatteryCallback);
                this.tryEmitCompleteReading(onDataCallback);
              } else if (value.byteLength >= 12) {
                // Fallback: 12+ bytes likely PM data
                this.parsePMCharacteristic(value);
                this.tryEmitCompleteReading(onDataCallback);
              } else if (value.byteLength >= 8) {
                // Fallback: 8 bytes likely environmental
                this.parseEnvironmentalCharacteristic(value, onBatteryCallback);
                this.tryEmitCompleteReading(onDataCallback);
              }
            }
          });
          charIndex++;
        }
      }
    }
  }

  private async setupDataNotification(
    char: BluetoothRemoteGATTCharacteristic,
    onDataCallback: (data: SensorReadingData) => void,
    onBatteryCallback?: (level: number) => void
  ): Promise<void> {
    await char.startNotifications();
    char.addEventListener('characteristicvaluechanged', (event: Event) => {
      const target = event.target as BluetoothRemoteGATTCharacteristic;
      const value = target.value;
      if (value) {
        this.parseDataCharacteristic(value, onBatteryCallback);
        this.tryEmitCompleteReading(onDataCallback);
      }
    });
    console.log('✅ Subscribed to DATA characteristic');
  }

  private async setupPMNotification(
    char: BluetoothRemoteGATTCharacteristic,
    onDataCallback: (data: SensorReadingData) => void
  ): Promise<void> {
    await char.startNotifications();
    char.addEventListener('characteristicvaluechanged', (event: Event) => {
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
   * Debug: Discover and log all GATT services on the device
   * Returns the list of discovered services for fallback use
   */
  private async discoverAllServices(server: BluetoothRemoteGATTServer): Promise<BluetoothRemoteGATTService[]> {
    try {
      console.log('🔍 DISCOVERING ALL GATT SERVICES...');
      const services = await server.getPrimaryServices();
      console.log(`📡 Found ${services.length} services total`);
      
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
      return services;
    } catch (e) {
      console.warn('Could not discover services:', e);
      return [];
    }
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
   * Parse Environmental characteristic (8 bytes) from db450003
   * Atmotube PRO format (different from PRO 2):
   * - Bytes 0-1: Temperature (Int16, scaled)
   * - Bytes 2-3: Humidity (Int16, scaled)
   * - Bytes 4-5: VOC or other
   * - Bytes 6-7: Status/flags
   */
  private parseEnvironmentalCharacteristic(rawData: DataView, onBatteryCallback?: (level: number) => void): void {
    try {
      console.log('📊 Parsing ENVIRONMENTAL characteristic, length:', rawData.byteLength);
      this.logRawData('ENV', rawData);
      
      if (rawData.byteLength < 8) {
        return;
      }

      // Try to parse temperature/humidity - exact format unknown, using heuristics
      const val0 = rawData.getInt16(0, true);
      const val1 = rawData.getInt16(2, true);
      
      // If values look like temperature (range -40 to 85°C * 100)
      if (val0 > -4000 && val0 < 8500) {
        this.partialData.temp = val0 / 100.0;
      }
      if (val1 > 0 && val1 < 10000) {
        this.partialData.humidity = val1 / 100.0;
      }

      console.log('📊 ENV parsed:', {
        temp: this.partialData.temp,
        humidity: this.partialData.humidity
      });
    } catch (error) {
      console.warn('Atmotube: ENV parsing failed', error);
    }
  }

  /**
   * Decode PM value according to Atmotube specification
   * 
   * For Atmotube PRO (db45xxxx UUIDs):
   * Bit 15 = 1: High precision format (value / 100 for µg/m³)
   * Bit 15 = 0: Low precision format (value / 10 for µg/m³)
   */
  private decodePmValue(raw: number): number {
    const PM_ENCODING_FLAG = 0x8000;      // Bit 15
    const PM_ENCODING_VALUE_MASK = 0x7FFF; // Bits 0-14
    
    if ((raw & PM_ENCODING_FLAG) !== 0) {
      // Bit 15 set → high precision, divide by 100
      return (raw & PM_ENCODING_VALUE_MASK) / 100.0;
    } else {
      // Bit 15 clear → low precision, divide by 10
      return raw / 10.0;
    }
  }

  /**
   * Parse PM characteristic (6+ bytes)
   * Based on official Android SDK:
   * - Bytes 0-1: PM1 (Uint16, bit 15 = encoding flag)
   * - Bytes 2-3: PM2.5 (Uint16, bit 15 = encoding flag)
   * - Bytes 4-5: PM10 (Uint16, bit 15 = encoding flag)
   */
  private parsePMCharacteristic(rawData: DataView): void {
    try {
      console.log('📊 Parsing PM characteristic, length:', rawData.byteLength);
      this.logRawData('PM', rawData);
      
      if (rawData.byteLength < 6) {
        console.warn('Atmotube: PM packet too short:', rawData.byteLength);
        return;
      }

      const pm1Raw = rawData.getUint16(0, true);
      const pm25Raw = rawData.getUint16(2, true);
      const pm10Raw = rawData.getUint16(4, true);

      // Use correct decoding with bit 15 flag
      this.partialData.pm1 = this.decodePmValue(pm1Raw);
      this.partialData.pm25 = this.decodePmValue(pm25Raw);
      this.partialData.pm10 = this.decodePmValue(pm10Raw);

      console.log('📊 PM parsed (corrected):', {
        pm1Raw: pm1Raw.toString(16),
        pm25Raw: pm25Raw.toString(16),
        pm10Raw: pm10Raw.toString(16),
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
