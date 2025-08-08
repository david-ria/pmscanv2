import { PMScanDevice } from './types';
import { PMScanDeviceState } from './deviceState';
import { PMScanDeviceInitializer } from './deviceInitializer';
import { PMScanEventManager } from './eventManager';
import { PMScanConnectionUtils } from './connectionUtils';
import { PMScan_MODE_UUID, PMScan_RT_DATA_UUID } from './constants';
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

  private deviceState: PMScanDeviceState;
  private deviceInitializer: PMScanDeviceInitializer;
  private eventManager: PMScanEventManager;

  constructor() {
    this.deviceState = new PMScanDeviceState();
    this.deviceInitializer = new PMScanDeviceInitializer(this.deviceState);
    this.eventManager = new PMScanEventManager(this.deviceState);
  }

  public get state() {
    return this.deviceState.state;
  }

  public isConnected(): boolean {
    return (this.device?.gatt?.connected && this.isInited) || false;
  }

  public shouldAutoConnect(): boolean {
    return this.shouldConnect;
  }

  public async requestDevice(): Promise<BluetoothDevice> {
    const device = await PMScanConnectionUtils.requestBluetoothDevice();
    this.device = device;
    this.isInited = false;
    this.shouldConnect = true;
    return device;
  }

  public async connect(): Promise<BluetoothRemoteGATTServer> {
    if (!this.device || !this.shouldConnect) {
      throw new Error('No device available or should not connect');
    }

    const server = await PMScanConnectionUtils.connectToDevice(this.device);
    this.server = server;
    return server;
  }

  public async initializeDevice(
    onRTData: (event: Event) => void,
    onIMData: (event: Event) => void,
    onBatteryData: (event: Event) => void,
    onChargingData: (event: Event) => void
  ): Promise<PMScanDevice> {
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

    if (this.device?.gatt?.connected && this.service) {
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

    this.device = null;
    this.server = null;
    this.service = null;
  }

  public async reestablishEventListeners(
    onRTData: (event: Event) => void,
    onIMData: (event: Event) => void,
    onBatteryData: (event: Event) => void,
    onChargingData: (event: Event) => void
  ): Promise<PMScanDevice | null> {
    if (!this.isConnected() || !this.service || !this.device) {
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

  /**
   * Send a keep-alive ping to maintain connection during background operation
   */
  public async keepAlive(): Promise<boolean> {
    if (!this.service || !this.device?.gatt?.connected) {
      return false;
    }

    try {
      // Try to read device info to verify connection is still active
      const modeChar = await this.service.getCharacteristic(PMScan_MODE_UUID);
      await modeChar.readValue();
      return true;
    } catch (error) {
      logger.debug('🔄 Keep-alive check failed, connection may be lost:', error);
      return false;
    }
  }

  /**
   * Read a single RT data sample synchronously.
   * Useful as a fallback when background notifications are throttled.
   */
  public async readCurrentRTData(): Promise<import('./types').PMScanData | null> {
    if (!this.service || !this.device?.gatt?.connected) {
      return null;
    }
    try {
      const rtChar = await this.service.getCharacteristic(PMScan_RT_DATA_UUID);
      const value = await rtChar.readValue();
      const { parsePMScanDataPayload } = await import('./dataParser');
      const data = parsePMScanDataPayload(value, this.deviceState.state);
      return data;
    } catch (error) {
      logger.debug('⚠️ Failed to read RT data in background:', error);
      return null;
    }
  }
}

