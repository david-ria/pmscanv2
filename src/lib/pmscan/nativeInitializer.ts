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
import { BleOperationWrapper } from './bleOperationWrapper';
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
    const batteryValue = await BleOperationWrapper.read(deviceId, PMScan_SERVICE_UUID, PMScan_BATTERY_UUID);
    const battery = batteryValue.getUint8(0);
    logger.debug(`🔋 Battery: ${battery}%`);
    this.deviceState.updateBattery(battery);

    // Start RT data notifications
    await BleOperationWrapper.startNotifications(
      deviceId,
      (value) => {
        const event = new CustomEvent('characteristicvaluechanged', {
          detail: { target: { value } }
        }) as any;
        event.target = { value };
        onRTData(event);
      },
      PMScan_SERVICE_UUID,
      PMScan_RT_DATA_UUID
    );

    // Start IM data notifications
    await BleOperationWrapper.startNotifications(
      deviceId,
      (value) => {
        const event = new CustomEvent('characteristicvaluechanged', {
          detail: { target: { value } }
        }) as any;
        event.target = { value };
        onIMData(event);
      },
      PMScan_SERVICE_UUID,
      PMScan_IM_DATA_UUID
    );

    // Start battery notifications
    await BleOperationWrapper.startNotifications(
      deviceId,
      (value) => {
        const event = new CustomEvent('characteristicvaluechanged', {
          detail: { target: { value } }
        }) as any;
        event.target = { value };
        onBatteryData(event);
      },
      PMScan_SERVICE_UUID,
      PMScan_BATTERY_UUID
    );

    // Start charging notifications
    await BleOperationWrapper.startNotifications(
      deviceId,
      (value) => {
        const event = new CustomEvent('characteristicvaluechanged', {
          detail: { target: { value } }
        }) as any;
        event.target = { value };
        onChargingData(event);
      },
      PMScan_SERVICE_UUID,
      PMScan_CHARGING_UUID
    );

    // Read and sync time if needed
    await this.syncDeviceTime(deviceId);

    // Read charging status
    const chargingValue = await BleOperationWrapper.read(deviceId, PMScan_SERVICE_UUID, PMScan_CHARGING_UUID);
    const charging = chargingValue.getUint8(0);
    logger.debug(`⚡ Charging: ${charging}`);
    this.deviceState.updateCharging(charging);

    // Read version
    const versionValue = await BleOperationWrapper.read(deviceId, PMScan_SERVICE_UUID, PMScan_OTH_UUID);
    const version = versionValue.getUint8(0) >> 2;
    logger.debug(`📋 Version: ${version}`);
    this.deviceState.updateVersion(version);

    // Read interval
    const intervalValue = await BleOperationWrapper.read(deviceId, PMScan_SERVICE_UUID, PMScan_INTERVAL_UUID);
    const interval = intervalValue.getUint8(0);
    logger.debug(`⏱️ Interval: ${interval}`);
    this.deviceState.updateInterval(interval);

    // Read mode
    const modeValue = await BleOperationWrapper.read(deviceId, PMScan_SERVICE_UUID, PMScan_MODE_UUID);
    const mode = modeValue.getUint8(0);
    logger.debug(`⚙️ Mode: ${mode}`);
    this.deviceState.updateMode(mode);

    // Read display settings
    const displayValue = await BleOperationWrapper.read(deviceId, PMScan_SERVICE_UUID, PMScan_DISPLAY_UUID);
    logger.debug(`🖥️ Display: ${displayValue.getUint8(0)}`);
    this.deviceState.updateDisplay(new Uint8Array(displayValue.buffer));

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
    const timeValue = await BleOperationWrapper.read(deviceId, PMScan_SERVICE_UUID, PMScan_TIME_UUID);
    const deviceTime = timeValue.getUint32(0, true);
    logger.debug(`⏰ Time is ${deviceTime}`);

    if (deviceTime === 0) {
      logger.debug('⏰ Time not sync, writing current time...');
      const timeDt2000 = Math.floor(new Date().getTime() / 1000 - DT_2000);
      const time = new Uint8Array(4);
      time[0] = timeDt2000 & 0xff;
      time[1] = (timeDt2000 >> 8) & 0xff;
      time[2] = (timeDt2000 >> 16) & 0xff;
      time[3] = (timeDt2000 >> 24) & 0xff;
      
      await BleOperationWrapper.write(deviceId, time, PMScan_SERVICE_UUID, PMScan_TIME_UUID);
    } else {
      logger.debug('⏰ Time already sync');
    }
  }
}