import { PMScanDevice, PMScanInternalState } from './types';
import { 
  PMScan_SERVICE_UUID, 
  PMScan_RT_DATA_UUID, 
  PMScan_IM_DATA_UUID, 
  PMScan_BATTERY_UUID, 
  PMScan_CHARGING_UUID, 
  PMScan_TIME_UUID, 
  PMScan_INTERVAL_UUID, 
  PMScan_MODE_UUID, 
  PMScan_OTH_UUID, 
  PMScan_DISPLAY_UUID,
  DT_2000 
} from './constants';

export class PMScanConnectionManager {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private service: BluetoothRemoteGATTService | null = null;
  private isInited = false;
  private shouldConnect = false;
  
  public state: PMScanInternalState = {
    name: "PMScanXXXXXX",
    version: 0,
    mode: 0,
    interval: 0,
    display: new Uint8Array(10),
    battery: 0,
    charging: 0,
    dataLogger: false,
    externalMemory: 0,
  };

  public isConnected(): boolean {
    return this.device?.gatt?.connected && this.isInited || false;
  }

  public shouldAutoConnect(): boolean {
    return this.shouldConnect;
  }

  public async requestDevice(): Promise<BluetoothDevice> {
    if (!navigator.bluetooth) {
      throw new Error('Bluetooth not available in this browser');
    }

    console.log('🔍 Requesting any Bluetooth device...');
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: "PMScan" }],
      optionalServices: [PMScan_SERVICE_UUID]
    });

    console.log('📱 Requested ' + device.name);
    this.device = device;
    this.isInited = false;
    this.shouldConnect = true;
    
    return device;
  }

  public async connect(): Promise<BluetoothRemoteGATTServer> {
    if (!this.device || !this.shouldConnect) {
      throw new Error('No device available or should not connect');
    }
    
    console.log('🔌 Connecting to Bluetooth Device...');
    const server = await this.device.gatt!.connect();
    this.server = server;
    return server;
  }

  public async initializeDevice(
    onRTData: (event: Event) => void,
    onIMData: (event: Event) => void,
    onBatteryData: (event: Event) => void,
    onChargingData: (event: Event) => void
  ): Promise<PMScanDevice> {
    if (!this.server) {
      throw new Error('No server connection available');
    }

    console.log('✅ PMScan Device Connected');
    this.isInited = false;
    console.log('🔍 Discovering services...');
    
    const service = await this.server.getPrimaryService(PMScan_SERVICE_UUID);
    this.service = service;

    // Read battery level
    const batteryChar = await service.getCharacteristic(PMScan_BATTERY_UUID);
    const batteryValue = await batteryChar.readValue();
    const battery = batteryValue.getUint8(0);
    console.log(`🔋 Battery: ${battery}%`);
    this.state.battery = battery;

    // Start RT data notifications
    const rtDataChar = await service.getCharacteristic(PMScan_RT_DATA_UUID);
    await rtDataChar.startNotifications();
    rtDataChar.addEventListener('characteristicvaluechanged', onRTData);

    // Start IM data notifications
    const imDataChar = await service.getCharacteristic(PMScan_IM_DATA_UUID);
    await imDataChar.startNotifications();
    imDataChar.addEventListener('characteristicvaluechanged', onIMData);

    // Start battery notifications
    await batteryChar.startNotifications();
    batteryChar.addEventListener('characteristicvaluechanged', onBatteryData);

    // Start charging notifications
    const chargingChar = await service.getCharacteristic(PMScan_CHARGING_UUID);
    await chargingChar.startNotifications();
    chargingChar.addEventListener('characteristicvaluechanged', onChargingData);

    // Read and sync time if needed
    const timeChar = await service.getCharacteristic(PMScan_TIME_UUID);
    const timeValue = await timeChar.readValue();
    const deviceTime = timeValue.getUint32(0);
    console.log(`⏰ Time is ${deviceTime}`);
    
    if (deviceTime === 0) {
      console.log('⏰ Time not sync, writing current time...');
      const timeDt2000 = Math.floor((new Date().getTime() / 1000) - DT_2000);
      const time = new Uint8Array(4);
      time[0] = timeDt2000 & 0xFF;
      time[1] = (timeDt2000 >> 8) & 0xFF;
      time[2] = (timeDt2000 >> 16) & 0xFF;
      time[3] = (timeDt2000 >> 24) & 0xFF;
      await timeChar.writeValueWithResponse(time);
    } else {
      console.log('⏰ Time already sync');
    }

    // Read charging status
    const chargingValue = await chargingChar.readValue();
    const charging = chargingValue.getUint8(0);
    console.log(`⚡ Charging: ${charging}`);
    this.state.charging = charging;

    // Read version
    const versionChar = await service.getCharacteristic(PMScan_OTH_UUID);
    const versionValue = await versionChar.readValue();
    const version = versionValue.getUint8(0) >> 2;
    console.log(`📋 Version: ${version}`);
    this.state.version = version;

    // Read interval
    const intervalChar = await service.getCharacteristic(PMScan_INTERVAL_UUID);
    const intervalValue = await intervalChar.readValue();
    const interval = intervalValue.getUint8(0);
    console.log(`⏱️ Interval: ${interval}`);
    this.state.interval = interval;

    // Read mode
    const modeChar = await service.getCharacteristic(PMScan_MODE_UUID);
    const modeValue = await modeChar.readValue();
    const mode = modeValue.getUint8(0);
    console.log(`⚙️ Mode: ${mode}`);
    this.state.mode = mode;

    // Read display settings
    const displayChar = await service.getCharacteristic(PMScan_DISPLAY_UUID);
    const displayValue = await displayChar.readValue();
    console.log(`🖥️ Display: ${displayValue.getUint8(0)}`);
    this.state.display = new Uint8Array(displayValue.buffer);

    this.isInited = true;
    console.log('🎉 Init finished');
    
    return {
      name: this.device?.name || "PMScan Device",
      version,
      mode,
      interval,
      battery,
      charging: charging === 1,
      connected: true
    };
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
        console.log('🔌 Requesting disconnect...');
        const modeChar = await this.service.getCharacteristic(PMScan_MODE_UUID);
        const modeToWrite = new Uint8Array(1);
        modeToWrite[0] = this.state.mode | 0x40;
        await modeChar.writeValueWithResponse(modeToWrite);
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
    if (!this.isConnected() || !this.service) {
      return null;
    }

    try {
      // Re-establish event listeners for existing connection
      const rtDataChar = await this.service.getCharacteristic(PMScan_RT_DATA_UUID);
      const imDataChar = await this.service.getCharacteristic(PMScan_IM_DATA_UUID);
      const batteryChar = await this.service.getCharacteristic(PMScan_BATTERY_UUID);
      const chargingChar = await this.service.getCharacteristic(PMScan_CHARGING_UUID);

      // Remove any existing listeners to prevent duplicates
      rtDataChar.removeEventListener('characteristicvaluechanged', onRTData);
      imDataChar.removeEventListener('characteristicvaluechanged', onIMData);
      batteryChar.removeEventListener('characteristicvaluechanged', onBatteryData);
      chargingChar.removeEventListener('characteristicvaluechanged', onChargingData);

      // Add new listeners
      rtDataChar.addEventListener('characteristicvaluechanged', onRTData);
      imDataChar.addEventListener('characteristicvaluechanged', onIMData);
      batteryChar.addEventListener('characteristicvaluechanged', onBatteryData);
      chargingChar.addEventListener('characteristicvaluechanged', onChargingData);

      console.log('🔄 Event listeners re-established');

      return {
        name: this.device?.name || "PMScan Device",
        version: this.state.version,
        mode: this.state.mode,
        interval: this.state.interval,
        battery: this.state.battery,
        charging: this.state.charging === 1,
        connected: true
      };
    } catch (error) {
      console.error('❌ Failed to re-establish event listeners:', error);
      return null;
    }
  }

  public updateBattery(level: number): void {
    this.state.battery = level;
  }

  public updateCharging(status: number): void {
    this.state.charging = status;
  }
}