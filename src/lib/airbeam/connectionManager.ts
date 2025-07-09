import { AirBeamDevice } from './types';
import { AirBeamDeviceState } from './deviceState';
import { AirBeamDeviceInitializer } from './deviceInitializer';
import { AirBeamEventManager } from './eventManager';
import { AirBeamConnectionUtils } from './connectionUtils';

export class AirBeamConnectionManager {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private service: BluetoothRemoteGATTService | null = null;
  private isInited = false;
  private shouldConnect = false;
  
  private deviceState: AirBeamDeviceState;
  private deviceInitializer: AirBeamDeviceInitializer;
  private eventManager: AirBeamEventManager;

  constructor() {
    this.deviceState = new AirBeamDeviceState();
    this.deviceInitializer = new AirBeamDeviceInitializer(this.deviceState);
    this.eventManager = new AirBeamEventManager(this.deviceState);
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
    const device = await AirBeamConnectionUtils.requestBluetoothDevice();
    this.device = device;
    this.isInited = false;
    this.shouldConnect = true;
    return device;
  }

  public async connect(): Promise<BluetoothRemoteGATTServer> {
    if (!this.device || !this.shouldConnect) {
      throw new Error('No AirBeam device available or should not connect');
    }
    
    const server = await AirBeamConnectionUtils.connectToDevice(this.device);
    this.server = server;
    return server;
  }

  public async initializeDevice(
    onDataReceived: (event: Event) => void
  ): Promise<AirBeamDevice> {
    if (!this.server || !this.device) {
      throw new Error('No AirBeam server connection available');
    }

    this.isInited = false;
    
    const { deviceInfo, service } = await this.deviceInitializer.initializeDevice(
      this.server,
      this.device,
      onDataReceived
    );
    
    this.service = service;
    this.isInited = true;
    
    return deviceInfo;
  }

  public async disconnect(): Promise<void> {
    // Check if we're recording globally before allowing disconnection
    const { getGlobalRecording } = require('./globalConnectionManager');
    if (getGlobalRecording()) {
      console.log('🚫 Cannot disconnect AirBeam while recording is active');
      return;
    }
    
    this.shouldConnect = false;
    
    if (this.device?.gatt?.connected && this.service) {
      try {
        await AirBeamConnectionUtils.sendDisconnectCommand(this.service);
        this.device.gatt.disconnect();
      } catch (err) {
        console.error('❌ Failed to send AirBeam disconnect command:', err);
      }
    }
    
    this.isInited = false;
  }

  public onDisconnected(): void {
    console.log('🔌 AirBeam Device disconnected');
    
    // Check if we should automatically reconnect (when recording)
    const { getGlobalRecording } = require('./globalConnectionManager');
    if (getGlobalRecording()) {
      console.log('🔄 Auto-reconnecting AirBeam due to active recording...');
      this.isInited = false;
    } else {
      this.isInited = false;
      this.shouldConnect = false;
    }
  }

  public async reestablishEventListeners(
    onDataReceived: (event: Event) => void
  ): Promise<AirBeamDevice | null> {
    if (!this.isConnected() || !this.service || !this.device) {
      return null;
    }

    return await this.eventManager.reestablishEventListeners(
      this.service,
      this.device,
      onDataReceived
    );
  }

  public updateBattery(level: number): void {
    this.deviceState.updateBattery(level);
  }

  public updateCharging(status: number): void {
    this.deviceState.updateCharging(status);
  }
}