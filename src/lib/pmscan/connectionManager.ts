import { PMScanDevice } from './types';
import { PMScanDeviceState } from './deviceState';
import { PMScanDeviceInitializer } from './deviceInitializer';
import { PMScanNativeInitializer } from './nativeInitializer';
import { PMScanEventManager } from './eventManager';
import { PMScanConnectionUtils } from './connectionUtils';
import { BleClient } from '@capacitor-community/bluetooth-le';
import { Capacitor } from '@capacitor/core';
import { runBleScan, FoundDevice } from '@/lib/bleScan';
import { PMScan_SERVICE_UUID, PMScan_MODE_UUID } from './constants';
import { BleOperationWrapper } from './bleOperationWrapper';
import {
  getGlobalRecording,
  getBackgroundRecording,
} from './globalConnectionManager';
import * as logger from '@/utils/logger';

export class PMScanConnectionManager {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private service: BluetoothRemoteGATTService | null = null;
  private isInited = false;
  private shouldConnect = false;
  
  // Native (Capacitor) BLE support
  private nativeDeviceId: string | null = null;
  private nativeConnected = false;

  private deviceState: PMScanDeviceState;
  private deviceInitializer: PMScanDeviceInitializer;
  private nativeInitializer: PMScanNativeInitializer;
  private eventManager: PMScanEventManager;

  constructor() {
    this.deviceState = new PMScanDeviceState();
    this.deviceInitializer = new PMScanDeviceInitializer(this.deviceState);
    this.nativeInitializer = new PMScanNativeInitializer(this.deviceState);
    this.eventManager = new PMScanEventManager(this.deviceState);
  }

  public get state() {
    return this.deviceState.state;
  }

  public isConnected(): boolean {
    if (Capacitor.isNativePlatform()) {
      return this.nativeConnected && this.isInited;
    }
    return (this.device?.gatt?.connected && this.isInited) || false;
  }

  public shouldAutoConnect(): boolean {
    return this.shouldConnect;
  }

  public async requestDevice(): Promise<BluetoothDevice> {
    // This method is now a wrapper that calls the new smart device selection
    const result = await PMScanConnectionUtils.requestBluetoothDeviceWithPicker();
    
    if (Capacitor.isNativePlatform()) {
      // For native platforms, result is FoundDevice
      const foundDevice = result as FoundDevice;
      this.nativeDeviceId = foundDevice.deviceId;
      this.isInited = false;
      this.shouldConnect = true;
      
      // Return a shim object for compatibility
      return {
        id: foundDevice.deviceId,
        name: foundDevice.name || 'PMScan Device',
        gatt: {} as BluetoothRemoteGATTServer
      } as BluetoothDevice;
    }

    // For web platforms, result is BluetoothDevice
    this.device = result as BluetoothDevice;
    this.isInited = false;
    this.shouldConnect = true;
    return result as BluetoothDevice;
  }

  public async connect(): Promise<BluetoothRemoteGATTServer> {
    if (Capacitor.isNativePlatform()) {
      if (!this.nativeDeviceId || !this.shouldConnect) {
        throw new Error('No native device ID available or should not connect');
      }

      logger.debug('🔌 Connecting to native BLE device...');
      await BleOperationWrapper.connect(this.nativeDeviceId);
      this.nativeConnected = true;
      
      // Return a shim object for compatibility
      return {} as BluetoothRemoteGATTServer;
    }

    if (!this.device || !this.shouldConnect) {
      throw new Error('No device available or should not connect');
    }

    const server = await BleOperationWrapper.connect(this.device) as BluetoothRemoteGATTServer;
    this.server = server;
    return server;
  }

  public async initializeDevice(
    onRTData: (event: Event) => void,
    onIMData: (event: Event) => void,
    onBatteryData: (event: Event) => void,
    onChargingData: (event: Event) => void
  ): Promise<PMScanDevice> {
    if (Capacitor.isNativePlatform()) {
      if (!this.nativeDeviceId || !this.nativeConnected) {
        throw new Error('No native device connection available');
      }

      this.isInited = false;

      const deviceInfo = await this.nativeInitializer.initializeDevice(
        this.nativeDeviceId,
        onRTData,
        onIMData,
        onBatteryData,
        onChargingData
      );

      this.isInited = true;
      return deviceInfo;
    }

    if (!this.server || !this.device) {
      throw new Error('No server connection available');
    }

    this.isInited = false;

    const { deviceInfo, service } =
      await this.deviceInitializer.initializeDevice(
        this.server,
        this.device,
        onRTData,
        onIMData,
        onBatteryData,
        onChargingData
      );

    this.service = service;
    this.isInited = true;

    return deviceInfo;
  }

  public async disconnect(force: boolean = false): Promise<boolean> {
    // Check if we're recording globally or in background mode before allowing disconnection
    const shouldPreventDisconnect =
      getGlobalRecording() || getBackgroundRecording();

    if (shouldPreventDisconnect && !force) {
      logger.debug(
        '🚫 Cannot disconnect PMScan while recording is active or background mode is enabled'
      );
      return false;
    }

    this.shouldConnect = false;

    if (Capacitor.isNativePlatform()) {
      if (this.nativeDeviceId && this.nativeConnected) {
        try {
          // Send disconnect command
          const modeToWrite = new Uint8Array(1);
          modeToWrite[0] = this.deviceState.state.mode | 0x40;
          await BleOperationWrapper.write(
            this.nativeDeviceId,
            modeToWrite,
            PMScan_SERVICE_UUID,
            PMScan_MODE_UUID
          );
          
          // Disconnect
          await BleClient.disconnect(this.nativeDeviceId);
          this.nativeConnected = false;
        } catch (err) {
          console.error('❌ Failed to send native disconnect command:', err);
        }
      }
    } else if (this.device?.gatt?.connected && this.service) {
      try {
        await PMScanConnectionUtils.sendDisconnectCommand(
          this.service,
          this.deviceState.state.mode
        );
        this.device.gatt.disconnect();
      } catch (err) {
        console.error('❌ Failed to send disconnect command:', err);
      }
    }

    this.isInited = false;
    return true;
  }

  public onDisconnected(): void {
    logger.debug('🔌 PMScan Device disconnected');
    this.isInited = false;

    // Check if we should automatically reconnect (when recording or in background mode)
    const shouldReconnect = getGlobalRecording() || getBackgroundRecording();

    if (shouldReconnect) {
      logger.debug(
        '🔄 Auto-reconnecting PMScan due to active recording or background mode...'
      );
      // Reset init state but keep shouldConnect true for reconnection
      this.isInited = false;
      // Don't set shouldConnect to false as we want to reconnect
    } else {
      this.shouldConnect = false;
    }

    // Reset connection state
    if (Capacitor.isNativePlatform()) {
      this.nativeConnected = false;
      this.nativeDeviceId = null;
    } else {
      this.device = null;
      this.server = null;
      this.service = null;
    }
  }

  public async reestablishEventListeners(
    onRTData: (event: Event) => void,
    onIMData: (event: Event) => void,
    onBatteryData: (event: Event) => void,
    onChargingData: (event: Event) => void
  ): Promise<PMScanDevice | null> {
    if (!this.isConnected()) {
      return null;
    }

    if (Capacitor.isNativePlatform()) {
      if (!this.nativeDeviceId) return null;

      // Re-establish native notifications
      return await this.nativeInitializer.initializeDevice(
        this.nativeDeviceId,
        onRTData,
        onIMData,
        onBatteryData,
        onChargingData
      );
    }

    if (!this.service || !this.device) {
      return null;
    }

    return await this.eventManager.reestablishEventListeners(
      this.service,
      this.device,
      onRTData,
      onIMData,
      onBatteryData,
      onChargingData
    );
  }

  public updateBattery(level: number): void {
    this.deviceState.updateBattery(level);
  }

  public updateCharging(status: number): void {
    this.deviceState.updateCharging(status);
  }
}
