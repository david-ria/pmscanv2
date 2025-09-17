import { BleClient } from '@capacitor-community/bluetooth-le';
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

/**
 * Handles PMScan device initialization using Capacitor BLE (native)
 */
export class PMScanNativeInitializer {
  constructor(private deviceState: PMScanDeviceState) {}

  public async initializeDevice(
    deviceId: string,
    onRTData: (event: Event) => void,
    onIMData: (event: Event) => void,
    onBatteryData: (event: Event) => void,
    onChargingData: (event: Event) => void
  ): Promise<PMScanDevice> {
    logger.debug('✅ PMScan Native Device Connected');
    logger.debug('🔍 Reading characteristics...');

    // Read battery level
    const batteryData = await BleClient.read(deviceId, PMScan_SERVICE_UUID, PMScan_BATTERY_UUID);
    const battery = new DataView(batteryData.buffer).getUint8(0);
    logger.debug(`🔋 Battery: ${battery}%`);
    this.deviceState.updateBattery(battery);

    // Start RT data notifications
    await BleClient.startNotifications(
      deviceId,
      PMScan_SERVICE_UUID,
      PMScan_RT_DATA_UUID,
      (value) => {
        const event = new CustomEvent('characteristicvaluechanged', {
          detail: { target: { value: new DataView(value.buffer) } }
        }) as any;
        event.target = { value: new DataView(value.buffer) };
        onRTData(event);
      }
    );

    // Start IM data notifications
    await BleClient.startNotifications(
      deviceId,
      PMScan_SERVICE_UUID,
      PMScan_IM_DATA_UUID,
      (value) => {
        const event = new CustomEvent('characteristicvaluechanged', {
          detail: { target: { value: new DataView(value.buffer) } }
        }) as any;
        event.target = { value: new DataView(value.buffer) };
        onIMData(event);
      }
    );

    // Start battery notifications
    await BleClient.startNotifications(
      deviceId,
      PMScan_SERVICE_UUID,
      PMScan_BATTERY_UUID,
      (value) => {
        const event = new CustomEvent('characteristicvaluechanged', {
          detail: { target: { value: new DataView(value.buffer) } }
        }) as any;
        event.target = { value: new DataView(value.buffer) };
        onBatteryData(event);
      }
    );

    // Start charging notifications
    await BleClient.startNotifications(
      deviceId,
      PMScan_SERVICE_UUID,
      PMScan_CHARGING_UUID,
      (value) => {
        const event = new CustomEvent('characteristicvaluechanged', {
          detail: { target: { value: new DataView(value.buffer) } }
        }) as any;
        event.target = { value: new DataView(value.buffer) };
        onChargingData(event);
      }
    );

    // Read and sync time if needed
    await this.syncDeviceTime(deviceId);

    // Read charging status
    const chargingData = await BleClient.read(deviceId, PMScan_SERVICE_UUID, PMScan_CHARGING_UUID);
    const charging = new DataView(chargingData.buffer).getUint8(0);
    logger.debug(`⚡ Charging: ${charging}`);
    this.deviceState.updateCharging(charging);

    // Read version
    const versionData = await BleClient.read(deviceId, PMScan_SERVICE_UUID, PMScan_OTH_UUID);
    const version = new DataView(versionData.buffer).getUint8(0) >> 2;
    logger.debug(`📋 Version: ${version}`);
    this.deviceState.updateVersion(version);

    // Read interval
    const intervalData = await BleClient.read(deviceId, PMScan_SERVICE_UUID, PMScan_INTERVAL_UUID);
    const interval = new DataView(intervalData.buffer).getUint8(0);
    logger.debug(`⏱️ Interval: ${interval}`);
    this.deviceState.updateInterval(interval);

    // Read mode
    const modeData = await BleClient.read(deviceId, PMScan_SERVICE_UUID, PMScan_MODE_UUID);
    const mode = new DataView(modeData.buffer).getUint8(0);
    logger.debug(`⚙️ Mode: ${mode}`);
    this.deviceState.updateMode(mode);

    // Read display settings
    const displayData = await BleClient.read(deviceId, PMScan_SERVICE_UUID, PMScan_DISPLAY_UUID);
    logger.debug(`🖥️ Display: ${new DataView(displayData.buffer).getUint8(0)}`);
    this.deviceState.updateDisplay(new Uint8Array(displayData.buffer));

    logger.debug('🎉 Native init finished');

    return {
      name: `PMScan Device`,
      version,
      mode,
      interval,
      battery,
      charging: charging === 1,
      connected: true,
    };
  }

  private async syncDeviceTime(deviceId: string): Promise<void> {
    const timeData = await BleClient.read(deviceId, PMScan_SERVICE_UUID, PMScan_TIME_UUID);
    const deviceTime = new DataView(timeData.buffer).getUint32(0, true);
    logger.debug(`⏰ Time is ${deviceTime}`);

    if (deviceTime === 0) {
      logger.debug('⏰ Time not sync, writing current time...');
      const timeDt2000 = Math.floor(new Date().getTime() / 1000 - DT_2000);
      const time = new Uint8Array(4);
      time[0] = timeDt2000 & 0xff;
      time[1] = (timeDt2000 >> 8) & 0xff;
      time[2] = (timeDt2000 >> 16) & 0xff;
      time[3] = (timeDt2000 >> 24) & 0xff;
      
      await BleClient.write(deviceId, PMScan_SERVICE_UUID, PMScan_TIME_UUID, new DataView(time.buffer));
    } else {
      logger.debug('⏰ Time already sync');
    }
  }
}