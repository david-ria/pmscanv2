import { ISensorAdapter, SensorReadingData } from '@/types/sensor';
import * as logger from '@/utils/logger';

/**
 * Atmotube Pro sensor adapter implementing the unified ISensorAdapter interface
 * Skeleton implementation - methods throw errors until real parsing is implemented
 */
export class AtmotubeAdapter implements ISensorAdapter {
  public readonly sensorId = 'atmotube';
  public readonly name = 'Atmotube Pro';

  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private lastReading: SensorReadingData | null = null;
  private battery: number = 0;
  private charging: number = 0;

  // Atmotube-specific UUIDs (to be defined when implementing real parsing)
  private static readonly ATMOTUBE_SERVICE_UUID = 'db450001-8e9a-4818-add7-6ed94a328ab4';
  private static readonly ATMOTUBE_DATA_UUID = 'db450002-8e9a-4818-add7-6ed94a328ab4';

  public async requestDevice(): Promise<BluetoothDevice> {
    if (!navigator.bluetooth) {
      throw new Error('Web Bluetooth API is not available');
    }

    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: 'ATMOTUBE' },
          { namePrefix: 'Atmotube' },
        ],
        optionalServices: [AtmotubeAdapter.ATMOTUBE_SERVICE_UUID],
      });
      
      this.device = device;
      return device;
    } catch (error) {
      logger.error('Atmotube device request failed:', error);
      throw new Error('Atmotube: Device request not implemented');
    }
  }

  public async connect(device: BluetoothDevice): Promise<BluetoothRemoteGATTServer> {
    if (!device.gatt) {
      throw new Error('Atmotube: GATT server not available');
    }

    try {
      const server = await device.gatt.connect();
      this.server = server;
      this.device = device;
      return server;
    } catch (error) {
      logger.error('Atmotube connection failed:', error);
      throw new Error('Atmotube: Connection not implemented');
    }
  }

  public async disconnect(force?: boolean): Promise<boolean> {
    logger.debug('Atmotube disconnect called, force:', force);
    
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
    onDataCallback: (data: SensorReadingData) => void
  ): Promise<void> {
    this.server = server;
    this.device = device;
    
    // TODO: Implement Atmotube-specific GATT characteristic subscriptions
    // This is a skeleton - real implementation requires:
    // 1. Discovering Atmotube-specific services (db450001-...)
    // 2. Subscribing to data characteristic (db450002-...)
    // 3. Parsing Atmotube data format into SensorReadingData
    // 4. Atmotube Pro also supports VOC and CO2 readings
    
    logger.warn('Atmotube: initializeNotifications not fully implemented');
    throw new Error('Atmotube: Notification initialization not implemented');
  }

  public updateBattery(level: number): void {
    this.battery = level;
  }

  public updateCharging(status: number): void {
    this.charging = status;
  }

  /**
   * Parse Atmotube-specific data format into unified SensorReadingData
   * Atmotube Pro supports: PM1, PM2.5, PM10, VOC, Temperature, Humidity
   * TODO: Implement actual Atmotube protocol parsing
   */
  private parseAtmotubeData(_rawData: DataView): SensorReadingData | null {
    // Skeleton - return null until real parsing is implemented
    // Atmotube data format includes:
    // - PM values (PM1, PM2.5, PM10)
    // - VOC index
    // - Temperature
    // - Humidity
    // - Battery level
    logger.warn('Atmotube: Data parsing not implemented');
    return null;
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
   * Atmotube-specific: Check if device supports VOC/CO2
   */
  public supportsVOC(): boolean {
    // Atmotube Pro supports VOC
    return true;
  }
}

// Export singleton instance
export const atmotubeAdapter = new AtmotubeAdapter();
