import { ISensorAdapter, SensorReadingData } from '@/types/sensor';
import { createTimestamp } from '@/utils/timeFormat';
import * as logger from '@/utils/logger';

/**
 * AirBeam sensor adapter implementing the unified ISensorAdapter interface
 * 
 * NOTE: AirBeam GATT UUIDs are not fully documented.
 * This adapter includes a diagnostic mode to discover the correct UUIDs.
 * 
 * AirBeam3 uses ESP32 and may use:
 * - Nordic UART Service
 * - Custom proprietary service
 * - Standard Environmental Sensing
 */
export class AirBeamAdapter implements ISensorAdapter {
  public readonly sensorId = 'airbeam' as const;
  public readonly name = 'AirBeam';

  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private lastReading: SensorReadingData | null = null;
  private battery: number = 0;
  private charging: number = 0;

  // Candidate service UUIDs to try (we don't know the exact one yet)
  private static readonly CANDIDATE_SERVICES = [
    '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART Service
    '0000ffe0-0000-1000-8000-00805f9b34fb', // HM-10 Module (common on ESP32)
    '0000181a-0000-1000-8000-00805f9b34fb', // Environmental Sensing (standard)
    '0000180f-0000-1000-8000-00805f9b34fb', // Battery Service
  ];

  // Currently active service UUID (discovered dynamically)
  private activeServiceUuid: string | null = null;
  private activeCharacteristicUuid: string | null = null;

  public async requestDevice(): Promise<BluetoothDevice> {
    if (!navigator.bluetooth) {
      throw new Error('Web Bluetooth API is not available');
    }

    try {
      console.log('🔍 Requesting AirBeam Bluetooth device...');
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: 'AirBeam' }],
        optionalServices: AirBeamAdapter.CANDIDATE_SERVICES,
      });
      
      this.device = device;
      console.log('📱 AirBeam device found:', device.name);
      return device;
    } catch (error) {
      console.error('AirBeam device request failed:', error);
      throw new Error('AirBeam: Device request failed');
    }
  }

  public async connect(device: BluetoothDevice): Promise<BluetoothRemoteGATTServer> {
    if (!device.gatt) {
      throw new Error('AirBeam: GATT server not available');
    }

    try {
      console.log('🔌 Connecting to AirBeam device...');
      const server = await device.gatt.connect();
      this.server = server;
      this.device = device;
      console.log('✅ AirBeam connected');
      return server;
    } catch (error) {
      console.error('AirBeam connection failed:', error);
      throw new Error('AirBeam: Connection failed');
    }
  }

  public async disconnect(force?: boolean): Promise<boolean> {
    console.log('🔌 AirBeam disconnect called, force:', force);
    
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }
    
    this.device = null;
    this.server = null;
    this.lastReading = null;
    this.activeServiceUuid = null;
    this.activeCharacteristicUuid = null;
    
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
      console.log('🔔 Initializing AirBeam notifications...');
      console.log('⚠️ AirBeam UUIDs are not confirmed - running diagnostic mode');
      
      // DIAGNOSTIC MODE: Discover all services first
      const discoveredServices = await this.discoverAllServices(server);
      
      // Try to find a working service/characteristic combo
      const success = await this.tryConnectToAnyService(server, onDataCallback);
      
      if (!success) {
        console.error('❌ Could not find working AirBeam service');
        console.log('📋 Available services:', discoveredServices);
        throw new Error('AirBeam: No compatible GATT service found. Check console for available services.');
      }
      
      console.log('✅ AirBeam notifications initialized');
    } catch (error) {
      console.error('AirBeam: initializeNotifications failed:', error);
      throw new Error('AirBeam: Notification initialization failed - ' + (error as Error).message);
    }
  }

  /**
   * DIAGNOSTIC: Discover and log all GATT services on the device
   */
  private async discoverAllServices(server: BluetoothRemoteGATTServer): Promise<string[]> {
    const discoveredUuids: string[] = [];
    
    try {
      console.log('🔍 ===== AIRBEAM GATT DISCOVERY =====');
      const services = await server.getPrimaryServices();
      
      for (const service of services) {
        discoveredUuids.push(service.uuid);
        console.log(`📡 Service UUID: ${service.uuid}`);
        
        try {
          const chars = await service.getCharacteristics();
          for (const char of chars) {
            const props = [];
            if (char.properties.notify) props.push('NOTIFY');
            if (char.properties.read) props.push('READ');
            if (char.properties.write) props.push('WRITE');
            if (char.properties.indicate) props.push('INDICATE');
            console.log(`   └── Characteristic: ${char.uuid} [${props.join(', ')}]`);
            
            // Try to read current value if readable
            if (char.properties.read) {
              try {
                const value = await char.readValue();
                this.logRawData(`      Value`, value);
              } catch {
                console.log(`      (Could not read value)`);
              }
            }
          }
        } catch (e) {
          console.log(`   └── Could not enumerate characteristics`);
        }
      }
      console.log('🔍 ===== END DISCOVERY =====');
    } catch (e) {
      console.warn('Could not discover services:', e);
    }
    
    return discoveredUuids;
  }

  /**
   * Try to connect to any available service with notifiable characteristics
   */
  private async tryConnectToAnyService(
    server: BluetoothRemoteGATTServer,
    onDataCallback: (data: SensorReadingData) => void
  ): Promise<boolean> {
    // First try candidate services
    for (const serviceUuid of AirBeamAdapter.CANDIDATE_SERVICES) {
      try {
        console.log(`🔍 Trying service: ${serviceUuid}`);
        const service = await server.getPrimaryService(serviceUuid);
        const chars = await service.getCharacteristics();
        
        for (const char of chars) {
          if (char.properties.notify || char.properties.indicate) {
            console.log(`✅ Found notifiable characteristic: ${char.uuid}`);
            
            await char.startNotifications();
            char.addEventListener('characteristicvaluechanged', (event: Event) => {
              const target = event.target as BluetoothRemoteGATTCharacteristic;
              const value = target.value;
              if (value) {
                console.log('📨 AirBeam data received!');
                this.logRawData('AirBeam', value);
                const data = this.parseAirBeamData(value);
                if (data) {
                  this.lastReading = data;
                  onDataCallback(data);
                }
              }
            });
            
            this.activeServiceUuid = serviceUuid;
            this.activeCharacteristicUuid = char.uuid;
            return true;
          }
        }
      } catch {
        // Service not found, try next
        continue;
      }
    }
    
    // If candidate services fail, try ALL available services
    console.log('⚠️ Candidate services failed, trying all available services...');
    try {
      const services = await server.getPrimaryServices();
      for (const service of services) {
        try {
          const chars = await service.getCharacteristics();
          for (const char of chars) {
            if (char.properties.notify || char.properties.indicate) {
              console.log(`✅ Found notifiable characteristic on ${service.uuid}: ${char.uuid}`);
              
              await char.startNotifications();
              char.addEventListener('characteristicvaluechanged', (event: Event) => {
                const target = event.target as BluetoothRemoteGATTCharacteristic;
                const value = target.value;
                if (value) {
                  console.log('📨 AirBeam data received!');
                  this.logRawData('AirBeam', value);
                  const data = this.parseAirBeamData(value);
                  if (data) {
                    this.lastReading = data;
                    onDataCallback(data);
                  }
                }
              });
              
              this.activeServiceUuid = service.uuid;
              this.activeCharacteristicUuid = char.uuid;
              return true;
            }
          }
        } catch {
          continue;
        }
      }
    } catch (e) {
      console.error('Failed to enumerate services:', e);
    }
    
    return false;
  }

  /**
   * Log raw data in hex for debugging
   */
  private logRawData(label: string, dataView: DataView): void {
    const bytes = [];
    for (let i = 0; i < dataView.byteLength; i++) {
      bytes.push(dataView.getUint8(i).toString(16).padStart(2, '0'));
    }
    console.log(`🔢 ${label} raw bytes (${dataView.byteLength}):`, bytes.join(' '));
    
    // Also try to interpret as ASCII string (in case it's text-based)
    try {
      const textDecoder = new TextDecoder('utf-8');
      const buffer = new Uint8Array(dataView.buffer, dataView.byteOffset, dataView.byteLength);
      const text = textDecoder.decode(buffer);
      if (/^[\x20-\x7E\r\n]+$/.test(text)) {
        console.log(`📝 ${label} as text:`, text);
      }
    } catch {
      // Ignore text decode errors
    }
  }

  /**
   * Parse AirBeam data - FLEXIBLE implementation that adapts to data format
   * Will be updated once we know the actual format
   */
  private parseAirBeamData(rawData: DataView): SensorReadingData | null {
    try {
      console.log('📊 Parsing AirBeam data, length:', rawData.byteLength);
      
      // Try to detect format based on data length
      if (rawData.byteLength >= 20) {
        // Try float32 format (original assumption)
        return this.parseFloat32Format(rawData);
      } else if (rawData.byteLength >= 10) {
        // Try int16 format (like Atmotube)
        return this.parseInt16Format(rawData);
      } else {
        console.warn('AirBeam: Unknown data format, length:', rawData.byteLength);
        // Create minimal reading with zeros for analysis
        return {
          pm1: 0,
          pm25: 0,
          pm10: 0,
          temp: 0,
          humidity: 0,
          battery: this.battery,
          charging: this.charging === 1,
          timestamp: createTimestamp(),
          location: 'AirBeam Device',
        };
      }
    } catch (error) {
      console.warn('AirBeam: Data parsing failed', error);
      return null;
    }
  }

  /**
   * Try parsing as float32 values
   */
  private parseFloat32Format(rawData: DataView): SensorReadingData | null {
    try {
      const pm25 = rawData.getFloat32(0, true);
      const pm10 = rawData.getFloat32(4, true);
      const temp = rawData.getFloat32(8, true);
      const humidity = rawData.getFloat32(12, true);
      const pressure = rawData.byteLength >= 20 ? rawData.getFloat32(16, true) : undefined;

      // Validate data ranges
      if (pm25 < 0 || pm25 > 1000 || pm10 < 0 || pm10 > 1000) {
        console.warn('AirBeam: Float32 PM values out of range, trying int16 format');
        return this.parseInt16Format(rawData);
      }

      console.log('📊 Parsed as Float32:', { pm25, pm10, temp, humidity, pressure });

      return {
        pm1: 0, // AirBeam doesn't report PM1
        pm25,
        pm10,
        temp,
        humidity,
        pressure,
        tvoc: undefined,
        battery: this.battery,
        charging: this.charging === 1,
        timestamp: createTimestamp(),
        location: 'AirBeam Device',
      };
    } catch {
      return null;
    }
  }

  /**
   * Try parsing as int16 values (scaled)
   */
  private parseInt16Format(rawData: DataView): SensorReadingData | null {
    try {
      // Try different scaling factors
      const pm25 = rawData.getUint16(0, true);
      const pm10 = rawData.byteLength >= 4 ? rawData.getUint16(2, true) : 0;
      const temp = rawData.byteLength >= 6 ? rawData.getInt16(4, true) / 100.0 : 0;
      const humidity = rawData.byteLength >= 8 ? rawData.getInt16(6, true) / 100.0 : 0;

      console.log('📊 Parsed as Int16:', { pm25, pm10, temp, humidity });

      return {
        pm1: 0,
        pm25,
        pm10,
        temp,
        humidity,
        battery: this.battery,
        charging: this.charging === 1,
        timestamp: createTimestamp(),
        location: 'AirBeam Device',
      };
    } catch {
      return null;
    }
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

  public supportsPressure(): boolean {
    return true; // AirBeam3 supports pressure
  }

  public supportsTVOC(): boolean {
    return false; // AirBeam does NOT support TVOC
  }
}

// Export singleton instance
export const airBeamAdapter = new AirBeamAdapter();
