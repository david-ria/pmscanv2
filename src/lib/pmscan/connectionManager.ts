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
import { runBleScan, FoundDevice, getWebBluetoothDeviceById } from '@/lib/bleScan';
import { PMScan_SERVICE_UUID, PMScan_MODE_UUID } from './constants';
import { BleOperationWrapper } from './bleOperationWrapper';
import {
  getGlobalRecording,
  getBackgroundRecording,
} from './globalConnectionManager';
import * as logger from '@/utils/logger';
import { safeBleDebugger } from '@/lib/bleSafeWrapper';

export class PMScanConnectionManager {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private service: BluetoothRemoteGATTService | null = null;
  private shouldConnect = false;
  private isUserInitiatedConnection = false; // Track if user initiated this connection
  
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
    // Auto-connect if we have recording enabled and we're not already connected
    return (getGlobalRecording() || getBackgroundRecording()) && !this.isConnected();
  }

  public async requestDevice(): Promise<BluetoothDevice> {
    this.stateMachine.transition(PMScanConnectionState.SCANNING, 'Starting device scan');
    
    try {
      return await safeBleDebugger.timeOperation('SCAN', 'Device Discovery', async () => {
        safeBleDebugger.info('SCAN', 'Starting Bluetooth device scan');
        
        const result = await PMScanConnectionUtils.requestBluetoothDeviceWithPicker();
        
        if (Capacitor.isNativePlatform()) {
          // For native platforms, result is FoundDevice
          const foundDevice = result as FoundDevice;
          this.nativeDeviceId = foundDevice.deviceId;
          this.shouldConnect = true;
          this.isUserInitiatedConnection = true;
          
          logger.debug(`🔗 PMScan: shouldConnect set to TRUE (user initiated, native)`, { deviceId: foundDevice.deviceId });
          safeBleDebugger.info('SCAN', `Native device found: ${foundDevice.name}`, undefined, { deviceId: foundDevice.deviceId });
          
          // Return a shim object for compatibility
          return {
            id: foundDevice.deviceId,
            name: foundDevice.name || 'PMScan Device',
            gatt: {} as BluetoothRemoteGATTServer
          } as BluetoothDevice;
        }

        // For web platforms, result is FoundDevice; retrieve cached BluetoothDevice
        const selected = result as FoundDevice;
        const webDevice = getWebBluetoothDeviceById(selected.deviceId);
        if (!webDevice) {
          throw new Error('Selected device not available in Web Bluetooth cache');
        }
        this.device = webDevice;
        this.shouldConnect = true;
        this.isUserInitiatedConnection = true;
        
        logger.debug(`🔗 PMScan: shouldConnect set to TRUE (user initiated, web)`, { deviceId: webDevice.id });
        safeBleDebugger.info('SCAN', `Web device found: ${webDevice.name}`, undefined, { deviceId: webDevice.id });
        return webDevice;
      });
    } catch (error) {
      this.stateMachine.transitionToError(error instanceof Error ? error : new Error(String(error)), 'Device scan failed');
      throw error;
    }
  }

  public async connect(): Promise<BluetoothRemoteGATTServer> {
    // If we're in an ERROR state, reset to IDLE to allow a valid flow
    const current = this.stateMachine.getState();
    if (current === PMScanConnectionState.ERROR) {
      this.stateMachine.transition(PMScanConnectionState.IDLE, 'Reset from ERROR', true);
    }

    // If we're already connected or connecting, avoid duplicate attempts
    if (this.isConnected()) {
      logger.debug('🔌 PMScan already connected - skipping connect');
      return this.server ?? ({} as BluetoothRemoteGATTServer);
    }
    if (this.stateMachine.isConnecting()) {
      logger.warn('⏳ PMScan connection in progress - skipping duplicate connect()');
      return this.server ?? ({} as BluetoothRemoteGATTServer);
    }

    // Ensure we have a target device before attempting to connect
    try {
      if (Capacitor.isNativePlatform()) {
        if (!this.nativeDeviceId && this.shouldConnect) {
          // Use the smart device selection flow (preferred/auto/picker)
          await this.requestDevice();
        }
      } else {
        if (!this.device && this.shouldConnect) {
          // Use the smart device selection flow (preferred/auto/picker)
          await this.requestDevice();
        }
      }
    } catch (err) {
      // Device selection failed (e.g., no devices or user cancelled)
      this.stateMachine.transitionToError(err instanceof Error ? err : new Error(String(err)), 'Device selection failed');
      throw err;
    }

    // Proceed with connection attempt
    this.stateMachine.transition(PMScanConnectionState.CONNECTING, 'Starting connection');

    try {
      return await safeBleDebugger.timeOperation('CONNECT', 'BLE Connection', async () => {
        if (Capacitor.isNativePlatform()) {
          if (!this.nativeDeviceId || !this.shouldConnect) {
            logger.error(`❌ PMScan: Connection blocked - nativeDeviceId: ${!!this.nativeDeviceId}, shouldConnect: ${this.shouldConnect}, userInitiated: ${this.isUserInitiatedConnection}`);
            throw new Error('No native device ID available or should not connect');
          }

          safeBleDebugger.info('CONNECT', '[BLE:CONNECT] connecting', undefined, { 
            deviceId: this.nativeDeviceId.slice(-8) 
          });
          await BleOperationWrapper.connect(this.nativeDeviceId);
          
          safeBleDebugger.info('CONNECT', '[BLE:CONNECT] success (native)', undefined, { 
            deviceId: this.nativeDeviceId.slice(-8) 
          });
          // Return a shim object for compatibility
          return {} as BluetoothRemoteGATTServer;
        }

        if (!this.device || !this.shouldConnect) {
          logger.error(`❌ PMScan: Connection blocked - device: ${!!this.device}, shouldConnect: ${this.shouldConnect}, userInitiated: ${this.isUserInitiatedConnection}`);
          throw new Error('No device available or should not connect');
        }

        safeBleDebugger.info('CONNECT', '[BLE:CONNECT] connecting', undefined, { 
          deviceId: this.device.id.slice(-8) 
        });
        const server = await BleOperationWrapper.connect(this.device) as BluetoothRemoteGATTServer;
        this.server = server;
        
        safeBleDebugger.info('CONNECT', '[BLE:CONNECT] success (web)', undefined, { 
          deviceId: this.device.id.slice(-8) 
        });
        return server;
      });
    } catch (error) {
      safeBleDebugger.error('CONNECT', '[BLE:CONNECT] error', undefined, {
        error: error instanceof Error ? error.message : String(error),
        deviceId: Capacitor.isNativePlatform() ? 
          (this.nativeDeviceId ? this.nativeDeviceId.slice(-8) : 'unknown') :
          (this.device ? this.device.id.slice(-8) : 'unknown')
      });
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
      return await safeBleDebugger.timeOperation('INIT', 'Device Initialization', async () => {
        if (Capacitor.isNativePlatform()) {
          if (!this.nativeDeviceId) {
            throw new Error('No native device connection available');
          }

          safeBleDebugger.info('INIT', `Initializing native device: ${this.nativeDeviceId}`);
          const deviceInfo = await this.nativeInitializer.initializeDevice(
            this.nativeDeviceId,
            onRTData,
            onIMData,
            onBatteryData,
            onChargingData
          );

          safeBleDebugger.info('INIT', '[BLE:INIT] services/characteristics discovered (native)', undefined, {
            deviceId: this.nativeDeviceId.slice(-8),
            version: deviceInfo.version, 
            battery: deviceInfo.battery,
            mode: deviceInfo.mode
          });
          safeBleDebugger.info('NOTIFY', '[BLE:NOTIFY] started (native)', undefined, {
            deviceId: this.nativeDeviceId.slice(-8)
          });
          this.stateMachine.transition(PMScanConnectionState.CONNECTED, 'Native initialization complete');
          this.isUserInitiatedConnection = false; // Reset after successful connection
          return deviceInfo;
        }

        if (!this.server || !this.device) {
          throw new Error('No server connection available');
        }

        safeBleDebugger.info('INIT', `Initializing web device: ${this.device.name}`, undefined, { deviceId: this.device.id });
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
        safeBleDebugger.info('INIT', '[BLE:INIT] services/characteristics discovered (web)', undefined, {
          deviceId: this.device.id.slice(-8),
          version: deviceInfo.version,
          battery: deviceInfo.battery,
          mode: deviceInfo.mode
        });
        safeBleDebugger.info('NOTIFY', '[BLE:NOTIFY] started (web)', undefined, {
          deviceId: this.device.id.slice(-8)
        });
        this.stateMachine.transition(PMScanConnectionState.CONNECTED, 'Web initialization complete');
        this.isUserInitiatedConnection = false; // Reset after successful connection

        return deviceInfo;
      });
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
      safeBleDebugger.warn('DISCONNECT', 'Cannot disconnect while recording is active', undefined, { 
        globalRecording: getGlobalRecording(),
        backgroundRecording: getBackgroundRecording(),
        force
      });
      return false;
    }

    this.stateMachine.transition(PMScanConnectionState.DISCONNECTING, 'Starting disconnection');
    this.shouldConnect = false;
    this.isUserInitiatedConnection = false;
    logger.debug(`🔗 PMScan: shouldConnect set to FALSE (manual disconnect)`);

    try {
      return await safeBleDebugger.timeOperation('DISCONNECT', 'Device Disconnection', async () => {
        if (Capacitor.isNativePlatform()) {
          if (this.nativeDeviceId) {
            safeBleDebugger.info('DISCONNECT', `Disconnecting native device: ${this.nativeDeviceId}`);
            
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
                safeBleDebugger.info('DISCONNECT', `Disconnect command sent (attempt ${attempt})`);
                break;
              } catch (err) {
                safeBleDebugger.warn('DISCONNECT', `Disconnect command failed (attempt ${attempt})`, undefined, { error: err });
                if (attempt === 3) {
                  safeBleDebugger.error('DISCONNECT', 'All disconnect command attempts failed');
                }
              }
            }
            
            // Force disconnect
            await BleClient.disconnect(this.nativeDeviceId);
            safeBleDebugger.info('DISCONNECT', 'Native BLE disconnection complete');
          }
        } else if (this.device?.gatt?.connected && this.service) {
          safeBleDebugger.info('DISCONNECT', `Disconnecting web device: ${this.device.name}`);
          
          // Send disconnect command with retry
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              await PMScanConnectionUtils.sendDisconnectCommand(
                this.service,
                this.deviceState.state.mode
              );
              safeBleDebugger.info('DISCONNECT', `Disconnect command sent (attempt ${attempt})`);
              break;
            } catch (err) {
              safeBleDebugger.warn('DISCONNECT', `Disconnect command failed (attempt ${attempt})`, undefined, { error: err });
              if (attempt === 3) {
                safeBleDebugger.error('DISCONNECT', 'All disconnect command attempts failed');
              }
            }
          }
          this.device.gatt.disconnect();
          safeBleDebugger.info('DISCONNECT', 'Web BLE disconnection complete');
        }

        this.stateMachine.transition(PMScanConnectionState.IDLE, 'Disconnection complete');
        return true;
      });
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
      // Don't reset shouldConnect if this is a user-initiated connection in progress
      if (!this.isUserInitiatedConnection) {
        this.shouldConnect = false;
        logger.debug(`🔗 PMScan: shouldConnect set to FALSE (auto disconnect cleanup)`);
      } else {
        logger.debug(`🔗 PMScan: shouldConnect preserved (user connection in progress)`);
      }
      this.stateMachine.transition(PMScanConnectionState.IDLE, 'Disconnection cleanup');
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