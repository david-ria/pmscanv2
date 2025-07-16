import { AirBeamDevice } from './types';
import { AirBeamDeviceState } from './deviceState';
import { AirBeamDeviceInitializer } from './deviceInitializer';
import { AirBeamEventManager } from './eventManager';
import { AirBeamConnectionUtils } from './connectionUtils';
import * as logger from '@/utils/logger';

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
    return (this.device?.gatt?.connected && this.isInited) || false;
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
      throw new Error('No device available or should not connect');
    }

    const server = await AirBeamConnectionUtils.connectToDevice(this.device);
    this.server = server;
    return server;
  }

  public async initializeDevice(
    onData: (event: Event) => void
  ): Promise<AirBeamDevice> {
    if (!this.server || !this.device) {
      throw new Error('No server connection available');
    }

    this.isInited = false;

    const { deviceInfo, service } =
      await this.deviceInitializer.initializeDevice(
        this.server,
        this.device,
        onData
      );

    this.service = service;
    this.isInited = true;

    return deviceInfo;
  }

  public async disconnect(): Promise<boolean> {
    this.shouldConnect = false;

    if (this.device?.gatt?.connected) {
      try {
        this.device.gatt.disconnect();
      } catch (err) {
        console.error('❌ Failed to disconnect AirBeam device:', err);
      }
    }

    this.isInited = false;
    return true;
  }

  public onDisconnected(): void {
    logger.debug('🔌 AirBeam Device disconnected');
    this.isInited = false;
    this.shouldConnect = false;
    this.device = null;
    this.server = null;
    this.service = null;
  }

  public async reestablishEventListeners(
    onData: (event: Event) => void
  ): Promise<AirBeamDevice | null> {
    if (!this.isConnected() || !this.service || !this.device) {
      return null;
    }

    return await this.eventManager.reestablishEventListeners(
      this.service,
      this.device,
      onData
    );
  }

  public updateBattery(level: number): void {
    this.deviceState.updateBattery(level);
  }

  public updateCharging(status: number): void {
    this.deviceState.updateCharging(status);
  }
}
