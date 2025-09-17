import { PMScanDevice } from './types';
import { PMScanDeviceState } from './deviceState';
import { PMScanDeviceInitializer } from './deviceInitializer';
import { PMScanNativeInitializer } from './nativeInitializer';
import { PMScanEventManager } from './eventManager';
import { PMScanConnectionUtils } from './connectionUtils';
import { PMScanStateMachine } from './stateMachine';
import { 
  PMScanConnectionState, 
  PMScanStateMachineCallbacks,
  StateChangeCallback,
  ErrorCallback,
  TimeoutCallback 
} from './connectionState';
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
  private shouldConnect = false;
  
  // Native (Capacitor) BLE support
  private nativeDeviceId: string | null = null;

  private deviceState: PMScanDeviceState;
  private deviceInitializer: PMScanDeviceInitializer;
  private nativeInitializer: PMScanNativeInitializer;
  private eventManager: PMScanEventManager;
  private stateMachine: PMScanStateMachine;

  constructor() {
    this.deviceState = new PMScanDeviceState();
    this.deviceInitializer = new PMScanDeviceInitializer(this.deviceState);
    this.nativeInitializer = new PMScanNativeInitializer(this.deviceState);
    this.eventManager = new PMScanEventManager(this.deviceState);
    
    const callbacks: PMScanStateMachineCallbacks = {
      onStateChange: ((from: PMScanConnectionState, to: PMScanConnectionState, context?: string) => {
        logger.debug(`🔄 PMScan: ${from} → ${to}${context ? ` (${context})` : ''}`);
      }) as StateChangeCallback,
      onError: ((error: Error, state: PMScanConnectionState) => {
        logger.error(`❌ PMScan error in state ${state}:`, error);
      }) as ErrorCallback,
      onTimeout: ((state: PMScanConnectionState) => {
        logger.warn(`⏰ PMScan timeout in state ${state}`);
      }) as TimeoutCallback
    };
    
    this.stateMachine = new PMScanStateMachine(callbacks);
  }

  public get state() {
    return this.deviceState.state;
  }

  public getConnectionState(): PMScanConnectionState {
    return this.stateMachine.getState();
  }

  public isConnected(): boolean {
    return this.stateMachine.isConnected();
  }

  public isConnecting(): boolean {
    return this.stateMachine.isConnecting();
  }

  public shouldAutoConnect(): boolean {
    return this.shouldConnect;
  }

  public async requestDevice(): Promise<BluetoothDevice> {
    this.stateMachine.transition(PMScanConnectionState.SCANNING, 'Starting device scan');

    try {
      const result = await PMScanConnectionUtils.requestBluetoothDeviceWithPicker();
      
      if (Capacitor.isNativePlatform()) {
        // For native platforms, result is FoundDevice
        const foundDevice = result as FoundDevice;
        this.nativeDeviceId = foundDevice.deviceId;
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
      this.shouldConnect = true;
      return result as BluetoothDevice;
    } catch (error) {
      this.stateMachine.transitionToError(error instanceof Error ? error : new Error(String(error)), 'Device scan failed');
      throw error;
    }
  }

  public async connect(): Promise<BluetoothRemoteGATTServer> {
    this.stateMachine.transition(PMScanConnectionState.CONNECTING, 'Starting connection');

    try {
      if (Capacitor.isNativePlatform()) {
        if (!this.nativeDeviceId || !this.shouldConnect) {
          throw new Error('No native device ID available or should not connect');
        }

        logger.debug('🔌 Connecting to native BLE device...');
        await BleOperationWrapper.connect(this.nativeDeviceId);
        
        // Return a shim object for compatibility
        return {} as BluetoothRemoteGATTServer;
      }

      if (!this.device || !this.shouldConnect) {
        throw new Error('No device available or should not connect');
      }

      const server = await BleOperationWrapper.connect(this.device) as BluetoothRemoteGATTServer;
      this.server = server;
      return server;
    } catch (error) {
      this.stateMachine.transitionToError(error instanceof Error ? error : new Error(String(error)), 'Connection failed');
      throw error;
    }
  }

  public async initializeDevice(
    onRTData: (event: Event) => void,
    onIMData: (event: Event) => void,
    onBatteryData: (event: Event) => void,
    onChargingData: (event: Event) => void
  ): Promise<PMScanDevice> {
    this.stateMachine.transition(PMScanConnectionState.INITIALIZING, 'Starting device initialization');

    try {
      if (Capacitor.isNativePlatform()) {
        if (!this.nativeDeviceId) {
          throw new Error('No native device connection available');
        }

        const deviceInfo = await this.nativeInitializer.initializeDevice(
          this.nativeDeviceId,
          onRTData,
          onIMData,
          onBatteryData,
          onChargingData
        );

        this.stateMachine.transition(PMScanConnectionState.CONNECTED, 'Native initialization complete');
        return deviceInfo;
      }

      if (!this.server || !this.device) {
        throw new Error('No server connection available');
      }

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
      this.stateMachine.transition(PMScanConnectionState.CONNECTED, 'Web initialization complete');

      return deviceInfo;
    } catch (error) {
      this.stateMachine.transitionToError(error instanceof Error ? error : new Error(String(error)), 'Initialization failed');
      throw error;
    }
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

    this.stateMachine.transition(PMScanConnectionState.DISCONNECTING, 'Starting disconnection');
    this.shouldConnect = false;

    try {
      if (Capacitor.isNativePlatform()) {
        if (this.nativeDeviceId) {
          // Send disconnect command with retry
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              const modeToWrite = new Uint8Array(1);
              modeToWrite[0] = this.deviceState.state.mode | 0x40;
              await BleOperationWrapper.write(
                this.nativeDeviceId,
                modeToWrite,
                PMScan_SERVICE_UUID,
                PMScan_MODE_UUID
              );
              logger.debug('✅ Disconnect command sent successfully');
              break;
            } catch (err) {
              logger.warn(`⚠️ Disconnect command attempt ${attempt} failed:`, err);
              if (attempt === 3) {
                logger.error('❌ All disconnect command attempts failed');
              }
            }
          }
          
          // Force disconnect
          await BleClient.disconnect(this.nativeDeviceId);
        }
      } else if (this.device?.gatt?.connected && this.service) {
        // Send disconnect command with retry
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            await PMScanConnectionUtils.sendDisconnectCommand(
              this.service,
              this.deviceState.state.mode
            );
            logger.debug('✅ Disconnect command sent successfully');
            break;
          } catch (err) {
            logger.warn(`⚠️ Disconnect command attempt ${attempt} failed:`, err);
            if (attempt === 3) {
              logger.error('❌ All disconnect command attempts failed');
            }
          }
        }
        this.device.gatt.disconnect();
      }

      this.stateMachine.transition(PMScanConnectionState.IDLE, 'Disconnection complete');
      return true;
    } catch (error) {
      this.stateMachine.transitionToError(error instanceof Error ? error : new Error(String(error)), 'Disconnection failed');
      // Still return true as we want to reset state
      return true;
    }
  }

  public onDisconnected(): void {
    logger.debug('🔌 PMScan Device disconnected');

    // Check if we should automatically reconnect (when recording or in background mode)
    const shouldReconnect = getGlobalRecording() || getBackgroundRecording();

    if (shouldReconnect) {
      logger.debug(
        '🔄 Auto-reconnecting PMScan due to active recording or background mode...'
      );
      this.stateMachine.transition(PMScanConnectionState.RECONNECTING, 'Auto-reconnect initiated');
      // Don't set shouldConnect to false as we want to reconnect
    } else {
      this.shouldConnect = false;
      this.stateMachine.transition(PMScanConnectionState.IDLE, 'Manual disconnection');
    }

    // Reset connection state
    if (Capacitor.isNativePlatform()) {
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
