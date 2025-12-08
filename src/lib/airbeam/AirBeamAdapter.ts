import { ISensorAdapter, SensorReadingData } from '@/types/sensor';
import * as logger from '@/utils/logger';

/**
 * AirBeam sensor adapter implementing the unified ISensorAdapter interface
 * Skeleton implementation - methods throw errors until real parsing is implemented
 */
export class AirBeamAdapter implements ISensorAdapter {
  public readonly sensorId = 'airbeam';
  public readonly name = 'AirBeam';

  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private lastReading: SensorReadingData | null = null;
  private battery: number = 0;
  private charging: number = 0;

  // AirBeam-specific UUIDs (to be defined when implementing real parsing)
  private static readonly AIRBEAM_SERVICE_UUID = '0000ffe0-0000-1000-8000-00805f9b34fb';

  public async requestDevice(): Promise<BluetoothDevice> {
    if (!navigator.bluetooth) {
      throw new Error('Web Bluetooth API is not available');
    }

    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: 'AirBeam' },
        ],
        optionalServices: [AirBeamAdapter.AIRBEAM_SERVICE_UUID],
      });
      
      this.device = device;
      return device;
    } catch (error) {
      logger.error('AirBeam device request failed:', error);
      throw new Error('AirBeam: Device request not implemented');
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
      throw new Error('AirBeam: Connection not implemented');
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
    onDataCallback: (data: SensorReadingData) => void
  ): Promise<void> {
    this.server = server;
    this.device = device;
    
    // TODO: Implement AirBeam-specific GATT characteristic subscriptions
    // This is a skeleton - real implementation requires:
    // 1. Discovering AirBeam-specific services
    // 2. Subscribing to PM data characteristics
    // 3. Parsing AirBeam data format into SensorReadingData
    
    logger.warn('AirBeam: initializeNotifications not fully implemented');
    throw new Error('AirBeam: Notification initialization not implemented');
  }

  public updateBattery(level: number): void {
    this.battery = level;
  }

  public updateCharging(status: number): void {
    this.charging = status;
  }

  /**
   * Parse AirBeam-specific data format into unified SensorReadingData
   * TODO: Implement actual AirBeam protocol parsing
   */
  private parseAirBeamData(_rawData: DataView): SensorReadingData | null {
    // Skeleton - return null until real parsing is implemented
    logger.warn('AirBeam: Data parsing not implemented');
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
}

// Export singleton instance
export const airBeamAdapter = new AirBeamAdapter();
