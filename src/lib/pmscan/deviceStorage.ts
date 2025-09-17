import * as logger from '@/utils/logger';

export interface StoredPMScanDevice {
  deviceId: string;
  name: string;
  lastConnected: string; // ISO timestamp
}

export class PMScanDeviceStorage {
  private static readonly STORAGE_KEY = 'pmscan-preferred-device';

  /**
   * Store the preferred PMScan device
   */
  public static storePreferredDevice(deviceId: string, name: string): void {
    try {
      const device: StoredPMScanDevice = {
        deviceId,
        name,
        lastConnected: new Date().toISOString(),
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(device));
      logger.debug('💾 Stored preferred PMScan device:', device);
    } catch (error) {
      console.warn('⚠️ Failed to store preferred device:', error);
    }
  }

  /**
   * Get the stored preferred PMScan device
   */
  public static getPreferredDevice(): StoredPMScanDevice | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return null;

      const device = JSON.parse(stored) as StoredPMScanDevice;
      logger.debug('📱 Retrieved preferred PMScan device:', device);
      return device;
    } catch (error) {
      console.warn('⚠️ Failed to retrieve preferred device:', error);
      return null;
    }
  }

  /**
   * Clear the stored preferred device (when device is no longer available)
   */
  public static forgetPreferredDevice(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      logger.debug('🗑️ Forgot preferred PMScan device');
    } catch (error) {
      console.warn('⚠️ Failed to forget preferred device:', error);
    }
  }

  /**
   * Check if a device matches the stored preferred device
   */
  public static isPreferredDevice(deviceId: string): boolean {
    const preferred = this.getPreferredDevice();
    return preferred?.deviceId === deviceId;
  }
}