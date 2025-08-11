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
  DT_2000,
} from './constants';
import { PMScanDeviceState } from './deviceState';
import { PMScanDevice } from './types';
import * as logger from '@/utils/logger';

// Global cleanup tracking for device initializers
const teardowns: Array<() => void> = [];
let intervalIds: Set<number> = new Set();
let timeoutIds: Set<number> = new Set();

/**
 * Helper function to register event listeners with automatic cleanup tracking
 */
function on(element: any, event: string, handler: any): void {
  element.addEventListener(event, handler);
  teardowns.push(() => element.removeEventListener(event, handler));
}

/**
 * Helper function to track intervals with automatic cleanup
 */
export function trackInterval(callback: () => void, delay: number): number {
  const id = window.setInterval(callback, delay);
  intervalIds.add(id);
  teardowns.push(() => {
    window.clearInterval(id);
    intervalIds.delete(id);
  });
  return id;
}

/**
 * Helper function to track timeouts with automatic cleanup
 */
export function trackTimeout(callback: () => void, delay: number): number {
  const id = window.setTimeout(callback, delay);
  timeoutIds.add(id);
  teardowns.push(() => {
    window.clearTimeout(id);
    timeoutIds.delete(id);
  });
  return id;
}

/**
 * Dispose all tracked listeners, intervals, and timeouts
 */
export function dispose(): void {
  logger.debug(`🧹 Disposing ${teardowns.length} tracked resources...`);
  teardowns.splice(0).forEach(fn => {
    try {
      fn();
    } catch (error) {
      logger.error('❌ Error during cleanup:', error);
    }
  });
  
  // Clear any remaining intervals/timeouts (failsafe)
  intervalIds.forEach(id => window.clearInterval(id));
  timeoutIds.forEach(id => window.clearTimeout(id));
  intervalIds.clear();
  timeoutIds.clear();
  
  logger.debug('✅ All device initializer resources disposed');
}

/**
 * Get current resource count for debugging
 */
export function getResourceCount(): { listeners: number, intervals: number, timeouts: number } {
  return {
    listeners: teardowns.length - intervalIds.size - timeoutIds.size,
    intervals: intervalIds.size,
    timeouts: timeoutIds.size
  };
}

/**
 * Handles PMScan device initialization and service discovery
 */
export class PMScanDeviceInitializer {
  constructor(private deviceState: PMScanDeviceState) {}

  public async initializeDevice(
    server: BluetoothRemoteGATTServer,
    device: BluetoothDevice,
    onRTData: (event: Event) => void,
    onIMData: (event: Event) => void,
    onBatteryData: (event: Event) => void,
    onChargingData: (event: Event) => void
  ): Promise<{
    deviceInfo: PMScanDevice;
    service: BluetoothRemoteGATTService;
  }> {
    logger.debug('✅ PMScan Device Connected');
    logger.debug('🔍 Discovering services...');

    const service = await server.getPrimaryService(PMScan_SERVICE_UUID);

    // Read battery level
    const batteryChar = await service.getCharacteristic(PMScan_BATTERY_UUID);
    const batteryValue = await batteryChar.readValue();
    const battery = batteryValue.getUint8(0);
    logger.debug(`🔋 Battery: ${battery}%`);
    this.deviceState.updateBattery(battery);

    // Start RT data notifications with tracked cleanup
    const rtDataChar = await service.getCharacteristic(PMScan_RT_DATA_UUID);
    await rtDataChar.startNotifications();
    on(rtDataChar, 'characteristicvaluechanged', onRTData);

    // Start IM data notifications with tracked cleanup
    const imDataChar = await service.getCharacteristic(PMScan_IM_DATA_UUID);
    await imDataChar.startNotifications();
    on(imDataChar, 'characteristicvaluechanged', onIMData);

    // Start battery notifications with tracked cleanup
    await batteryChar.startNotifications();
    on(batteryChar, 'characteristicvaluechanged', onBatteryData);

    // Start charging notifications with tracked cleanup
    const chargingChar = await service.getCharacteristic(PMScan_CHARGING_UUID);
    await chargingChar.startNotifications();
    on(chargingChar, 'characteristicvaluechanged', onChargingData);

    // Read and sync time if needed
    await this.syncDeviceTime(service);

    // Read charging status
    const chargingValue = await chargingChar.readValue();
    const charging = chargingValue.getUint8(0);
    logger.debug(`⚡ Charging: ${charging}`);
    this.deviceState.updateCharging(charging);

    // Read version
    const versionChar = await service.getCharacteristic(PMScan_OTH_UUID);
    const versionValue = await versionChar.readValue();
    const version = versionValue.getUint8(0) >> 2;
    logger.debug(`📋 Version: ${version}`);
    this.deviceState.updateVersion(version);

    // Read interval
    const intervalChar = await service.getCharacteristic(PMScan_INTERVAL_UUID);
    const intervalValue = await intervalChar.readValue();
    const interval = intervalValue.getUint8(0);
    logger.debug(`⏱️ Interval: ${interval}`);
    this.deviceState.updateInterval(interval);

    // Read mode
    const modeChar = await service.getCharacteristic(PMScan_MODE_UUID);
    const modeValue = await modeChar.readValue();
    const mode = modeValue.getUint8(0);
    logger.debug(`⚙️ Mode: ${mode}`);
    this.deviceState.updateMode(mode);

    // Read display settings
    const displayChar = await service.getCharacteristic(PMScan_DISPLAY_UUID);
    const displayValue = await displayChar.readValue();
    logger.debug(`🖥️ Display: ${displayValue.getUint8(0)}`);
    this.deviceState.updateDisplay(new Uint8Array(displayValue.buffer));

    logger.debug('🎉 Device initialization finished');
    logger.debug(`📊 Resources tracked: ${JSON.stringify(getResourceCount())}`);

    const deviceInfo: PMScanDevice = {
      name: device?.name || 'PMScan Device',
      version,
      mode,
      interval,
      battery,
      charging: charging === 1,
      connected: true,
    };

    return { deviceInfo, service };
  }

  private async syncDeviceTime(
    service: BluetoothRemoteGATTService
  ): Promise<void> {
    const timeChar = await service.getCharacteristic(PMScan_TIME_UUID);
    const timeValue = await timeChar.readValue();
    const deviceTime = timeValue.getUint32(0);
    logger.debug(`⏰ Time is ${deviceTime}`);

    if (deviceTime === 0) {
      logger.debug('⏰ Time not sync, writing current time...');
      const timeDt2000 = Math.floor(new Date().getTime() / 1000 - DT_2000);
      const time = new Uint8Array(4);
      time[0] = timeDt2000 & 0xff;
      time[1] = (timeDt2000 >> 8) & 0xff;
      time[2] = (timeDt2000 >> 16) & 0xff;
      time[3] = (timeDt2000 >> 24) & 0xff;
      await timeChar.writeValueWithResponse(time);
    } else {
      logger.debug('⏰ Time already sync');
    }
  }
}
