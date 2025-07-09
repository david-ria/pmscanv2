import { PMScanDevice } from './types';
import { PMScanDeviceState } from './deviceState';
import { PMScanDeviceInitializer } from './deviceInitializer';
import { PMScanEventManager } from './eventManager';
import { PMScanConnectionUtils } from './connectionUtils';

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
    return this.device?.gatt?.connected && this.isInited || false;
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
    
    const { deviceInfo, service } = await this.deviceInitializer.initializeDevice(
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

  public async disconnect(): Promise<void> {
    // Check if we're recording globally before allowing disconnection
    const { getGlobalRecording } = require('./globalConnectionManager');
    if (getGlobalRecording()) {
      console.log('🚫 Cannot disconnect PMScan while recording is active');
      return;
    }
    
    this.shouldConnect = false;
    
    if (this.device?.gatt?.connected && this.service) {
      try {
        await PMScanConnectionUtils.sendDisconnectCommand(this.service, this.deviceState.state.mode);
        this.device.gatt.disconnect();
      } catch (err) {
        console.error('❌ Failed to send disconnect command:', err);
      }
    }
    
    this.isInited = false;
  }

  public onDisconnected(): void {
    console.log('🔌 PMScan Device disconnected');
    
    // Check if we should automatically reconnect (when recording)
    const { getGlobalRecording } = require('./globalConnectionManager');
    if (getGlobalRecording()) {
      console.log('🔄 Auto-reconnecting PMScan due to active recording...');
      // Reset init state but keep shouldConnect true for reconnection
      this.isInited = false;
      // Don't set shouldConnect to false as we want to reconnect
    } else {
      this.isInited = false;
      this.shouldConnect = false;
    }
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
}
