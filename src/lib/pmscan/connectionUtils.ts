import { PMScan_SERVICE_UUID, PMScan_MODE_UUID } from './constants';
import * as logger from '@/utils/logger';
import { runBleScan, FoundDevice } from '@/lib/bleScan';
import { PMScanDeviceStorage } from './deviceStorage';
import { Capacitor } from '@capacitor/core';

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
  public static async requestBluetoothDeviceWithPicker(): Promise<BluetoothDevice | FoundDevice> {
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
      logger.debug('✅ Auto-selected single device:', { id: selectedDevice.deviceId.slice(-8), name: selectedDevice.name });
      
      // Store as preferred for future use
      PMScanDeviceStorage.storePreferredDevice(selectedDevice.deviceId, selectedDevice.name || 'PMScan Device');
    } else {
      // Priority 3: Show picker for multiple devices
      logger.debug('🎯 Multiple devices found, showing picker...');
      
      // Clear stored device if it's not available anymore
      if (preferredDevice) {
        logger.debug('⚠️ Preferred device not available, clearing storage');
        PMScanDeviceStorage.forgetPreferredDevice();
      }

      selectedDevice = await this.showDevicePicker(devices);
      
      // Store selected device as preferred
      PMScanDeviceStorage.storePreferredDevice(selectedDevice.deviceId, selectedDevice.name || 'PMScan Device');
    }

    // Handle platform-specific connection
    if (Capacitor.isNativePlatform()) {
      // For native platforms, return the selected device info
      return selectedDevice;
    }

    // For web, use the standard Web Bluetooth API
    if (!navigator.bluetooth) {
      throw new Error('Bluetooth not available in this browser');
    }

    const device = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: 'PMScan' }],
      optionalServices: [PMScan_SERVICE_UUID],
    });

    logger.debug('📱 Connected to web device:', device.name);
    return device;
  }

  /**
   * Show device picker UI and wait for user selection
   */
  private static async showDevicePicker(devices: FoundDevice[]): Promise<FoundDevice> {
    return new Promise((resolve, reject) => {
      // Store resolvers for the picker component to use
      devicePickerResolver = resolve;
      devicePickerRejecter = reject;
      
      // Dispatch custom event to trigger picker UI
      window.dispatchEvent(new CustomEvent('pmscan-show-device-picker', { 
        detail: { devices } 
      }));
      
      // Timeout after 30 seconds
      setTimeout(() => {
        if (devicePickerResolver) {
          devicePickerRejecter?.(new Error('Device selection timeout'));
          devicePickerResolver = null;
          devicePickerRejecter = null;
        }
      }, 30000);
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
      devicePickerRejecter(error || new Error('Device selection cancelled'));
      devicePickerResolver = null;
      devicePickerRejecter = null;
    }
  }

  public static async requestBluetoothDevice(): Promise<BluetoothDevice> {
    // Legacy method - now uses the smart picker
    const result = await this.requestBluetoothDeviceWithPicker();
    return result as BluetoothDevice;
  }

  public static async connectToDevice(
    device: BluetoothDevice
  ): Promise<BluetoothRemoteGATTServer> {
    logger.debug('🔌 Connecting to Bluetooth Device...');
    const server = await device.gatt!.connect();
    return server;
  }

  public static async sendDisconnectCommand(
    service: BluetoothRemoteGATTService,
    mode: number
  ): Promise<void> {
    try {
      logger.debug('🔌 Requesting disconnect...');
      const modeChar = await service.getCharacteristic(PMScan_MODE_UUID);
      const modeToWrite = new Uint8Array(1);
      modeToWrite[0] = mode | 0x40;
      await modeChar.writeValueWithResponse(modeToWrite);
    } catch (err) {
      console.error('❌ Failed to send disconnect command:', err);
      throw err;
    }
  }
}
