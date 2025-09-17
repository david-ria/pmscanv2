import { PMScan_SERVICE_UUID, PMScan_MODE_UUID } from './constants';
import { BleOperationWrapper } from './bleOperationWrapper';
import * as logger from '@/utils/logger';
import { runBleScan, FoundDevice } from '@/lib/bleScan';
import { PMScanDeviceStorage } from './deviceStorage';
import { Capacitor } from '@capacitor/core';
import { safeBleDebugger } from '@/lib/bleSafeWrapper';

// Device picker state management
let devicePickerResolver: ((device: FoundDevice) => void) | null = null;
let devicePickerRejecter: ((error: Error) => void) | null = null;

/**
 * Utility functions for PMScan connection management
 */
export class PMScanConnectionUtils {
  /**
   * Smart device selection with persistent storage and picker UI
   */
  public static async requestBluetoothDeviceWithPicker(): Promise<FoundDevice> {
    return this.performScanAndSelect();
  }

  /**
   * Perform scan and device selection logic (used by both initial and rescan)
   */
  private static async performScanAndSelect(): Promise<FoundDevice> {
    // Scan for available PMScan devices
    logger.debug('🔍 Scanning for PMScan devices...');
    const devices = await runBleScan({ 
      timeoutMs: 10000, 
      services: [PMScan_SERVICE_UUID] 
    });

    if (devices.length === 0) {
      throw new Error('No PMScan devices found');
    }

    logger.debug(`📱 Found ${devices.length} PMScan device(s):`, devices.map(d => ({ id: d.deviceId.slice(-8), name: d.name })));

    // Get preferred device from storage
    const preferredDevice = PMScanDeviceStorage.getPreferredDevice();
    
    // Check if preferred device is available
    const availablePreferred = preferredDevice 
      ? devices.find(d => d.deviceId === preferredDevice.deviceId)
      : null;

    let selectedDevice: FoundDevice;

    if (availablePreferred) {
      // Priority 1: Use preferred device if available
      selectedDevice = availablePreferred;
      logger.debug('✅ Using preferred device:', { id: selectedDevice.deviceId.slice(-8), name: selectedDevice.name });
    } else if (devices.length === 1) {
      // Priority 2: Auto-select if only one device
      selectedDevice = devices[0];
      safeBleDebugger.info('PICKER', '[BLE:PICKER] autoSelect-single', undefined, { 
        id: selectedDevice.deviceId.slice(-8), 
        name: selectedDevice.name 
      });
      
      // Store as preferred for future use
      PMScanDeviceStorage.storePreferredDevice(selectedDevice.deviceId, selectedDevice.name || 'PMScan Device');
    } else {
      // Priority 3: Show picker for multiple devices
      safeBleDebugger.info('PICKER', '[BLE:PICKER] open', undefined, { count: devices.length });
      
      // Clear stored device if it's not available anymore
      if (preferredDevice) {
        logger.debug('⚠️ Preferred device not available, clearing storage');
        PMScanDeviceStorage.forgetPreferredDevice();
      }

      try {
        selectedDevice = await this.showDevicePicker(devices, true);
        safeBleDebugger.info('PICKER', '[BLE:PICKER] resolve selection', undefined, {
          id: selectedDevice.deviceId.slice(-8),
          name: selectedDevice.name
        });
      } catch (error) {
        // If picker fails/times out, auto-select device with best RSSI
        const sortedByRssi = devices.sort((a, b) => (b.rssi || -100) - (a.rssi || -100));
        selectedDevice = sortedByRssi[0];
        safeBleDebugger.info('PICKER', '[BLE:PICKER] autoSelect-timeout-bestRssi', undefined, {
          id: selectedDevice.deviceId.slice(-8),
          name: selectedDevice.name,
          rssi: selectedDevice.rssi,
          reason: error instanceof Error ? error.message : 'timeout'
        });
      }
      
      // Store selected device as preferred
      PMScanDeviceStorage.storePreferredDevice(selectedDevice.deviceId, selectedDevice.name || 'PMScan Device');
    }

    // Return the selected device for both native and web platforms
    // The web device selection is already handled in runBleScanWeb()
    logger.debug('📱 Selected device:', { id: selectedDevice.deviceId.slice(-8), name: selectedDevice.name });
    return selectedDevice;
  }

  /**
   * Show device picker UI and wait for user selection
   */
  private static async showDevicePicker(devices: FoundDevice[], enableRescan: boolean = false): Promise<FoundDevice> {
    return new Promise((resolve, reject) => {
      // Store resolvers for the picker component to use
      devicePickerResolver = resolve;
      devicePickerRejecter = reject;
      
      // Dispatch custom event to trigger picker UI
      window.dispatchEvent(new CustomEvent('pmscan-show-device-picker', { 
        detail: { devices, enableRescan } 
      }));
      
      // Timeout after 10 seconds (reduced from 30s for better UX)
      setTimeout(() => {
        if (devicePickerResolver) {
          safeBleDebugger.info('PICKER', '[BLE:PICKER] timeout', undefined, { timeoutMs: 10000 });
          devicePickerRejecter?.(new Error('Device selection timeout'));
          devicePickerResolver = null;
          devicePickerRejecter = null;
        }
      }, 10000);
    });
  }

  /**
   * Called by DevicePicker component when user selects a device
   */
  public static resolveDevicePicker(device: FoundDevice): void {
    if (devicePickerResolver) {
      devicePickerResolver(device);
      devicePickerResolver = null;
      devicePickerRejecter = null;
    }
  }

  /**
   * Called by DevicePicker component when user cancels
   */
  public static rejectDevicePicker(error?: Error): void {
    if (devicePickerRejecter) {
      safeBleDebugger.info('PICKER', '[BLE:PICKER] cancel', undefined, { 
        reason: error?.message || 'user cancelled' 
      });
      devicePickerRejecter(error || new Error('Device selection cancelled'));
      devicePickerResolver = null;
      devicePickerRejecter = null;
    }
  }

  /**
   * Called by DevicePicker component when user requests rescan
   */
  public static async rescanDevices(): Promise<void> {
    // Close current picker
    if (devicePickerRejecter) {
      devicePickerRejecter(new Error('Rescan requested'));
      devicePickerResolver = null;
      devicePickerRejecter = null;
    }

    // Trigger new scan and selection process
    try {
      const selectedDevice = await this.performScanAndSelect();
      // The new picker will be shown automatically by performScanAndSelect
    } catch (error) {
      logger.error('Rescan failed:', error);
      // Re-throw to handle in UI
      throw error;
    }
  }

  public static async requestBluetoothDevice(): Promise<FoundDevice> {
    // Legacy method - now uses the smart picker
    const result = await this.requestBluetoothDeviceWithPicker();
    return result;
  }

  public static async connectToDevice(
    device: BluetoothDevice
  ): Promise<BluetoothRemoteGATTServer> {
    logger.debug('🔌 Connecting to Bluetooth Device...');
    const server = await BleOperationWrapper.connect(device) as BluetoothRemoteGATTServer;
    return server;
  }

  public static async sendDisconnectCommand(
    service: BluetoothRemoteGATTService,
    mode: number
  ): Promise<void> {
    try {
      logger.debug('🔌 Requesting disconnect...');
      const modeChar = await BleOperationWrapper.getCharacteristic(service, PMScan_MODE_UUID);
      const modeToWrite = new Uint8Array(1);
      modeToWrite[0] = mode | 0x40;
      await BleOperationWrapper.write(modeChar, modeToWrite);
    } catch (err) {
      console.error('❌ Failed to send disconnect command:', err);
      throw err;  
    }
  }
}
