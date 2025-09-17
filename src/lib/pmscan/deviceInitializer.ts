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

    const service = await BleOperationWrapper.getService(server, PMScan_SERVICE_UUID);

    // Read battery level
    const batteryChar = await BleOperationWrapper.getCharacteristic(service, PMScan_BATTERY_UUID);
    const batteryValue = await BleOperationWrapper.read(batteryChar);
    const battery = batteryValue.getUint8(0);
    logger.debug(`🔋 Battery: ${battery}%`);
    this.deviceState.updateBattery(battery);

    // Get all characteristics first
    const rtDataChar = await BleOperationWrapper.getCharacteristic(service, PMScan_RT_DATA_UUID);
    const imDataChar = await BleOperationWrapper.getCharacteristic(service, PMScan_IM_DATA_UUID);
    const chargingChar = await BleOperationWrapper.getCharacteristic(service, PMScan_CHARGING_UUID);

    // Start all notifications in parallel with Promise.allSettled
    const notificationResults = await Promise.allSettled([
      // Critical: RT data notifications
      BleOperationWrapper.startNotifications(rtDataChar, (value) => {
        const event = { target: { value } } as any;
        onRTData(event);
      }),
      // Non-critical: IM data notifications
      BleOperationWrapper.startNotifications(imDataChar, (value) => {
        const event = { target: { value } } as any;
        onIMData(event);
      }),
      // Non-critical: Battery notifications
      BleOperationWrapper.startNotifications(batteryChar, (value) => {
        const event = { target: { value } } as any;
        onBatteryData(event);
      }),
      // Non-critical: Charging notifications
      BleOperationWrapper.startNotifications(chargingChar, (value) => {
        const event = { target: { value } } as any;
        onChargingData(event);
      })
    ]);

    // Check critical notifications (RT data)
    if (notificationResults[0].status === 'rejected') {
      logger.error('❌ Critical RT data notifications failed:', notificationResults[0].reason);
      throw new Error('Failed to start critical RT data notifications');
    }

    // Log non-critical notification failures but continue
    const failureMessages = [];
    if (notificationResults[1].status === 'rejected') {
      logger.warn('⚠️ IM data notifications failed:', notificationResults[1].reason);
      failureMessages.push('IM data');
    }
    if (notificationResults[2].status === 'rejected') {
      logger.warn('⚠️ Battery notifications failed:', notificationResults[2].reason);
      failureMessages.push('Battery');
    }
    if (notificationResults[3].status === 'rejected') {
      logger.warn('⚠️ Charging notifications failed:', notificationResults[3].reason);
      failureMessages.push('Charging');
    }

    if (failureMessages.length > 0) {
      logger.warn(`⚠️ Some non-critical notifications failed: ${failureMessages.join(', ')}`);
    }

    logger.debug('✅ RT data notifications started successfully');
    const successCount = notificationResults.filter(r => r.status === 'fulfilled').length;
    logger.debug(`📊 ${successCount}/4 notifications active`);

    // Read and sync time if needed
    await this.syncDeviceTime(service);

    // Read charging status
    const chargingValue = await BleOperationWrapper.read(chargingChar);
    const charging = chargingValue.getUint8(0);
    logger.debug(`⚡ Charging: ${charging}`);
    this.deviceState.updateCharging(charging);

    // Read version
    const versionChar = await BleOperationWrapper.getCharacteristic(service, PMScan_OTH_UUID);
    const versionValue = await BleOperationWrapper.read(versionChar);
    const version = versionValue.getUint8(0) >> 2;
    logger.debug(`📋 Version: ${version}`);
    this.deviceState.updateVersion(version);

    // Read interval
    const intervalChar = await BleOperationWrapper.getCharacteristic(service, PMScan_INTERVAL_UUID);
    const intervalValue = await BleOperationWrapper.read(intervalChar);
    const interval = intervalValue.getUint8(0);
    logger.debug(`⏱️ Interval: ${interval}`);
    this.deviceState.updateInterval(interval);

    // Read mode
    const modeChar = await BleOperationWrapper.getCharacteristic(service, PMScan_MODE_UUID);
    const modeValue = await BleOperationWrapper.read(modeChar);
    const mode = modeValue.getUint8(0);
    logger.debug(`⚙️ Mode: ${mode}`);
    this.deviceState.updateMode(mode);

    // Read display settings
    const displayChar = await BleOperationWrapper.getCharacteristic(service, PMScan_DISPLAY_UUID);
    const displayValue = await BleOperationWrapper.read(displayChar);
    logger.debug(`🖥️ Display: ${displayValue.getUint8(0)}`);
    this.deviceState.updateDisplay(new Uint8Array(displayValue.buffer));

    logger.debug('🎉 Init finished');

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
    const timeChar = await BleOperationWrapper.getCharacteristic(service, PMScan_TIME_UUID);
    const timeValue = await BleOperationWrapper.read(timeChar);
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
      await BleOperationWrapper.write(timeChar, time);
    } else {
      logger.debug('⏰ Time already sync');
    }
  }
}
