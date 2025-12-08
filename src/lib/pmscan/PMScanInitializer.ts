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
import { PMScanDevice } from '@/types/sensor';
import * as logger from '@/utils/logger';

/**
 * Handles PMScan device initialization and service discovery
 * Renamed from PMScanDeviceInitializer for consistency
 */
export class PMScanInitializer {
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
