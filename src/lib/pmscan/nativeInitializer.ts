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
import { MtuManager, FragmentManager } from './mtuManager';
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

    // Negotiate MTU for optimal performance
    const mtuInfo = await MtuManager.negotiateMtu(deviceId);
    logger.debug(`📡 MTU negotiated: ${mtuInfo.negotiated} bytes (${mtuInfo.effective} effective)`);

    // Read battery level
    const batteryValue = await BleOperationWrapper.read(deviceId, PMScan_SERVICE_UUID, PMScan_BATTERY_UUID);
    const battery = batteryValue.getUint8(0);
    logger.debug(`🔋 Battery: ${battery}%`);
    this.deviceState.updateBattery(battery);

    // Start all notifications in parallel with Promise.allSettled
    const notificationResults = await Promise.allSettled([
      // Critical: RT data notifications with fragmentation handling
      BleOperationWrapper.startNotifications(
        deviceId,
        (value) => {
          FragmentManager.processNotification(PMScan_RT_DATA_UUID, value, (assembledData) => {
            const event = new CustomEvent('characteristicvaluechanged', {
              detail: { target: { value: new DataView(assembledData.buffer) } }
            }) as any;
            event.target = { value: new DataView(assembledData.buffer) };
            onRTData(event);
          });
        },
        PMScan_SERVICE_UUID,
        PMScan_RT_DATA_UUID
      ),
      // Non-critical: IM data notifications with fragmentation handling
      BleOperationWrapper.startNotifications(
        deviceId,
        (value) => {
          FragmentManager.processNotification(PMScan_IM_DATA_UUID, value, (assembledData) => {
            const event = new CustomEvent('characteristicvaluechanged', {
              detail: { target: { value: new DataView(assembledData.buffer) } }
            }) as any;
            event.target = { value: new DataView(assembledData.buffer) };
            onIMData(event);
          });
        },
        PMScan_SERVICE_UUID,
        PMScan_IM_DATA_UUID
      ),
      // Non-critical: Battery notifications
      BleOperationWrapper.startNotifications(
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
      ),
      // Non-critical: Charging notifications
      BleOperationWrapper.startNotifications(
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
      )
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