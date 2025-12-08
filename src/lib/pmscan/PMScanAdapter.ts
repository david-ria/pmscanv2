import { ISensorAdapter, SensorReadingData, PMScanDevice } from '@/types/sensor';
import { PMScanDeviceState } from './deviceState';
import { PMScanInitializer } from './PMScanInitializer';
import { PMScanEventManager } from './eventManager';
import { PMScanConnectionUtils } from './connectionUtils';
import { parseRTData } from './dataParser';
import {
  getGlobalRecording,
  getBackgroundRecording,
} from './globalConnectionManager';
import * as logger from '@/utils/logger';

/**
 * PMScan adapter implementing the unified ISensorAdapter interface
 * Encapsulates all PMScan-specific Bluetooth logic
 */
export class PMScanAdapter implements ISensorAdapter {
  public readonly sensorId = 'pmscan';
  public readonly name = 'PMScan';

  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private service: BluetoothRemoteGATTService | null = null;
  private isInited = false;
  private shouldConnect = false;
  private lastReading: SensorReadingData | null = null;

  private deviceState: PMScanDeviceState;
  private deviceInitializer: PMScanInitializer;
  private eventManager: PMScanEventManager;

  constructor() {
    this.deviceState = new PMScanDeviceState();
    this.deviceInitializer = new PMScanInitializer(this.deviceState);
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

  // ISensorAdapter implementation
  public async requestDevice(): Promise<BluetoothDevice> {
    const device = await PMScanConnectionUtils.requestBluetoothDevice();
    this.device = device;
    this.isInited = false;
    this.shouldConnect = true;
    return device;
  }

  public async connect(device?: BluetoothDevice): Promise<BluetoothRemoteGATTServer> {
    const targetDevice = device || this.device;
    if (!targetDevice || !this.shouldConnect) {
      throw new Error('No device available or should not connect');
    }

    const server = await PMScanConnectionUtils.connectToDevice(targetDevice);
    this.server = server;
    return server;
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
    
    // Create internal handlers that parse and forward data
    const onRTData = (event: Event) => {
      const target = event.target as BluetoothRemoteGATTCharacteristic;
      const value = target.value;
      if (value) {
        const data = parseRTData(value);
        if (data) {
          this.lastReading = data;
          onDataCallback(data);
        }
      }
    };

    const onIMData = (_event: Event) => {
      // IM data handling - currently not processed to avoid duplicates
    };

    const onBatteryData = (event: Event) => {
      const target = event.target as BluetoothRemoteGATTCharacteristic;
      const value = target.value;
      if (value) {
        const level = value.getUint8(0);
        this.updateBattery(level);
      }
    };

    const onChargingData = (event: Event) => {
      const target = event.target as BluetoothRemoteGATTCharacteristic;
      const value = target.value;
      if (value) {
        const status = value.getUint8(0);
        this.updateCharging(status);
      }
    };

    const { service } = await this.deviceInitializer.initializeDevice(
      server,
      device,
      onRTData,
      onIMData,
      onBatteryData,
      onChargingData
    );

    this.service = service;
    this.isInited = true;
  }

  // Legacy initialization method for backward compatibility
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

  public updateBattery(level: number): void {
    this.deviceState.updateBattery(level);
  }

  public updateCharging(status: number): void {
    this.deviceState.updateCharging(status);
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
      this.isInited = false;
    } else {
      this.shouldConnect = false;
    }

    this.device = null;
    this.server = null;
    this.service = null;
    this.lastReading = null;
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
}

// Export singleton for backward compatibility
export const pmScanAdapter = new PMScanAdapter();
