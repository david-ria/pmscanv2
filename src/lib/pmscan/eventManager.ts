import {
  PMScan_RT_DATA_UUID,
  PMScan_IM_DATA_UUID,
  PMScan_BATTERY_UUID,
  PMScan_CHARGING_UUID,
} from './constants';
import { PMScanDeviceState } from './deviceState';
import { PMScanDevice } from './types';
import * as logger from '@/utils/logger';

/**
 * Manages event listeners for PMScan device characteristics
 */
export class PMScanEventManager {
  constructor(private deviceState: PMScanDeviceState) {}

  public async reestablishEventListeners(
    service: BluetoothRemoteGATTService,
    device: BluetoothDevice,
    onRTData: (event: Event) => void,
    onIMData: (event: Event) => void,
    onBatteryData: (event: Event) => void,
    onChargingData: (event: Event) => void
  ): Promise<PMScanDevice | null> {
    try {
      // Re-establish event listeners for existing connection
      const rtDataChar = await service.getCharacteristic(PMScan_RT_DATA_UUID);
      const imDataChar = await service.getCharacteristic(PMScan_IM_DATA_UUID);
      const batteryChar = await service.getCharacteristic(PMScan_BATTERY_UUID);
      const chargingChar =
        await service.getCharacteristic(PMScan_CHARGING_UUID);

      // Remove any existing listeners to prevent duplicates
      rtDataChar.removeEventListener('characteristicvaluechanged', onRTData);
      imDataChar.removeEventListener('characteristicvaluechanged', onIMData);
      batteryChar.removeEventListener(
        'characteristicvaluechanged',
        onBatteryData
      );
      chargingChar.removeEventListener(
        'characteristicvaluechanged',
        onChargingData
      );

      // Add new listeners and start notifications
      await rtDataChar.startNotifications();
      rtDataChar.addEventListener('characteristicvaluechanged', onRTData);

      await imDataChar.startNotifications();
      imDataChar.addEventListener('characteristicvaluechanged', onIMData);

      await batteryChar.startNotifications();
      batteryChar.addEventListener('characteristicvaluechanged', onBatteryData);

      await chargingChar.startNotifications();
      chargingChar.addEventListener(
        'characteristicvaluechanged',
        onChargingData
      );

      logger.debug(
        '🔄 Event listeners re-established and notifications started'
      );

      return {
        name: device?.name || 'PMScan Device',
        version: this.deviceState.state.version,
        mode: this.deviceState.state.mode,
        interval: this.deviceState.state.interval,
        battery: this.deviceState.state.battery,
        charging: this.deviceState.state.charging === 1,
        connected: true,
      };
    } catch (error) {
      console.error('❌ Failed to re-establish event listeners:', error);
      return null;
    }
  }
}
