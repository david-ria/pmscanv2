import { ISensorAdapter, SensorReadingData } from '@/types/sensor';
import { createTimestamp } from '@/utils/timeFormat';
import * as logger from '@/utils/logger';

/**
 * AirBeam3 sensor adapter implementing the unified ISensorAdapter interface
 * 
 * AirBeam3 uses Nordic UART Service (NUS) with text-based serial protocol:
 * - Service: 6E400001-B5A3-F393-E0A9-E50E24DCCA9E
 * - RX Characteristic (notifications): 6E400003-B5A3-F393-E0A9-E50E24DCCA9E
 * - TX Characteristic (write): 6E400002-B5A3-F393-E0A9-E50E24DCCA9E
 * 
 * Data format: 24 space-separated values per line
 * Fields: [0-14 unused], [15] Temp°C, [16 unused], [17] Humidity%, 
 *         [18 unused], [19] PM1, [20 unused], [21] PM2.5, [22 unused], [23] PM10
 */
export class AirBeamAdapter implements ISensorAdapter {
  public readonly sensorId = 'airbeam' as const;
  public readonly name = 'AirBeam';

  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private lastReading: SensorReadingData | null = null;
  private battery: number = 100; // AirBeam3 doesn't report battery via BLE
  private charging: number = 0;

  // Nordic UART Service UUIDs (primary for AirBeam3)
  private static readonly NORDIC_UART_SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
  private static readonly NORDIC_UART_RX = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'; // Notifications
  private static readonly NORDIC_UART_TX = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'; // Write

  // Fallback service UUIDs to try
  private static readonly CANDIDATE_SERVICES = [
    '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART Service (primary)
    '0000ffe0-0000-1000-8000-00805f9b34fb', // HM-10 Module
    '0000181a-0000-1000-8000-00805f9b34fb', // Environmental Sensing
    '0000180f-0000-1000-8000-00805f9b34fb', // Battery Service
  ];

  // Text buffer for reassembling multi-packet messages
  private textBuffer: string = '';

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
    this.textBuffer = '';
    
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
      
      // First, try Nordic UART Service directly (most likely for AirBeam3)
      const nordicSuccess = await this.tryNordicUartService(server, onDataCallback);
      
      if (nordicSuccess) {
        console.log('✅ AirBeam connected via Nordic UART Service');
        return;
      }
      
      // Fallback: Discovery mode
      console.log('⚠️ Nordic UART not found, running discovery mode...');
      const discoveredServices = await this.discoverAllServices(server);
      
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
   * Try to connect to Nordic UART Service (primary method for AirBeam3)
   */
  private async tryNordicUartService(
    server: BluetoothRemoteGATTServer,
    onDataCallback: (data: SensorReadingData) => void
  ): Promise<boolean> {
    try {
      console.log('🔍 Trying Nordic UART Service...');
      const service = await server.getPrimaryService(AirBeamAdapter.NORDIC_UART_SERVICE);
      
      // Subscribe to RX characteristic for notifications
      const rxCharacteristic = await service.getCharacteristic(AirBeamAdapter.NORDIC_UART_RX);
      
      console.log('✅ Found Nordic UART RX characteristic');
      
      await rxCharacteristic.startNotifications();
      rxCharacteristic.addEventListener('characteristicvaluechanged', (event: Event) => {
        const target = event.target as BluetoothRemoteGATTCharacteristic;
        const value = target.value;
        if (value) {
          this.handleNordicUartData(value, onDataCallback);
        }
      });
      
      this.activeServiceUuid = AirBeamAdapter.NORDIC_UART_SERVICE;
      this.activeCharacteristicUuid = AirBeamAdapter.NORDIC_UART_RX;
      
      return true;
    } catch (error) {
      console.log('❌ Nordic UART Service not available:', (error as Error).message);
      return false;
    }
  }

  /**
   * Handle incoming Nordic UART data (text-based, may be fragmented)
   */
  private handleNordicUartData(
    dataView: DataView,
    onDataCallback: (data: SensorReadingData) => void
  ): void {
    // Decode UTF-8 bytes to string
    const textDecoder = new TextDecoder('utf-8');
    const buffer = new Uint8Array(dataView.buffer, dataView.byteOffset, dataView.byteLength);
    const chunk = textDecoder.decode(buffer);
    
    console.log('📨 AirBeam UART chunk received:', chunk.replace(/\n/g, '\\n'));
    
    // Add to buffer
    this.textBuffer += chunk;
    
    // Process complete lines (separated by newline)
    const lines = this.textBuffer.split('\n');
    
    // Keep the last incomplete line in the buffer
    this.textBuffer = lines.pop() || '';
    
    // Process each complete line
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.length > 0) {
        console.log('📝 Processing AirBeam line:', trimmedLine);
        const data = this.parseTextLine(trimmedLine);
        if (data) {
          this.lastReading = data;
          onDataCallback(data);
        }
      }
    }
  }

  /**
   * Parse a complete text line from AirBeam3
   * Format: 24 space-separated values
   * Fields: [15]=Temp, [17]=Humidity, [19]=PM1, [21]=PM2.5, [23]=PM10
   */
  private parseTextLine(line: string): SensorReadingData | null {
    try {
      // Split by whitespace (space or tab)
      const fields = line.split(/\s+/).filter(f => f.length > 0);
      
      console.log(`🔢 AirBeam parsed ${fields.length} fields:`, fields);
      
      // Check if we have enough fields (expecting 24)
      if (fields.length >= 24) {
        // Parse values from documented positions
        const temp = parseFloat(fields[15]) || 0;
        const humidity = parseFloat(fields[17]) || 0;
        const pm1 = parseFloat(fields[19]) || 0;
        const pm25 = parseFloat(fields[21]) || 0;
        const pm10 = parseFloat(fields[23]) || 0;
        
        // Validate PM values are in reasonable range
        if (pm25 >= 0 && pm25 < 2000 && pm10 >= 0 && pm10 < 2000) {
          console.log('✅ AirBeam parsed:', { pm1, pm25, pm10, temp, humidity });
          
          return {
            pm1,
            pm25,
            pm10,
            temp,
            humidity,
            pressure: undefined, // AirBeam3 doesn't report pressure via BLE
            tvoc: undefined,
            battery: this.battery,
            charging: this.charging === 1,
            timestamp: createTimestamp(),
            location: 'AirBeam Device',
          };
        } else {
          console.warn('⚠️ AirBeam PM values out of range:', { pm1, pm25, pm10 });
        }
      } else if (fields.length >= 6) {
        // Alternative format: fewer fields, try common positions
        // Try format: PM1 PM2.5 PM10 Temp Humidity ...
        return this.tryAlternativeTextFormat(fields);
      }
      
      // If we can't parse 24 fields, try as comma-separated or other formats
      if (line.includes(',')) {
        return this.parseCommaSeparated(line);
      }
      
      console.warn('⚠️ AirBeam: Unknown text format, fields:', fields.length);
      return null;
    } catch (error) {
      console.error('AirBeam text parsing error:', error);
      return null;
    }
  }

  /**
   * Try alternative text format (fewer fields)
   */
  private tryAlternativeTextFormat(fields: string[]): SensorReadingData | null {
    try {
      // Common format: PM1 PM2.5 PM10 Temp Humidity (first 5 values)
      const pm1 = parseFloat(fields[0]) || 0;
      const pm25 = parseFloat(fields[1]) || 0;
      const pm10 = parseFloat(fields[2]) || 0;
      const temp = parseFloat(fields[3]) || 0;
      const humidity = parseFloat(fields[4]) || 0;
      
      if (pm25 >= 0 && pm25 < 2000) {
        console.log('✅ AirBeam alt format parsed:', { pm1, pm25, pm10, temp, humidity });
        return {
          pm1,
          pm25,
          pm10,
          temp,
          humidity,
          battery: this.battery,
          charging: this.charging === 1,
          timestamp: createTimestamp(),
          location: 'AirBeam Device',
        };
      }
    } catch {
      // Ignore
    }
    return null;
  }

  /**
   * Try parsing comma-separated format
   */
  private parseCommaSeparated(line: string): SensorReadingData | null {
    try {
      const fields = line.split(',').map(f => f.trim());
      if (fields.length >= 5) {
        const pm1 = parseFloat(fields[0]) || 0;
        const pm25 = parseFloat(fields[1]) || 0;
        const pm10 = parseFloat(fields[2]) || 0;
        const temp = parseFloat(fields[3]) || 0;
        const humidity = parseFloat(fields[4]) || 0;
        
        if (pm25 >= 0 && pm25 < 2000) {
          console.log('✅ AirBeam CSV parsed:', { pm1, pm25, pm10, temp, humidity });
          return {
            pm1,
            pm25,
            pm10,
            temp,
            humidity,
            battery: this.battery,
            charging: this.charging === 1,
            timestamp: createTimestamp(),
            location: 'AirBeam Device',
          };
        }
      }
    } catch {
      // Ignore
    }
    return null;
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
        } catch {
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
    // Try candidate services
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
                // Try text-based parsing first, then binary fallback
                this.handleNordicUartData(value, onDataCallback);
              }
            });
            
            this.activeServiceUuid = serviceUuid;
            this.activeCharacteristicUuid = char.uuid;
            return true;
          }
        }
      } catch {
        continue;
      }
    }
    
    // Try ALL available services
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
                  this.handleNordicUartData(value, onDataCallback);
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
    
    // Also try to interpret as ASCII string
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
    return false; // AirBeam3 doesn't report pressure via BLE
  }

  public supportsTVOC(): boolean {
    return false; // AirBeam does NOT support TVOC
  }
}

// Export singleton instance
export const airBeamAdapter = new AirBeamAdapter();
