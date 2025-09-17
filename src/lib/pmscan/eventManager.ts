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

      // Start all notifications in parallel with Promise.allSettled
      const notificationResults = await Promise.allSettled([
        // Critical: RT data
        (async () => {
          await rtDataChar.startNotifications();
          rtDataChar.addEventListener('characteristicvaluechanged', onRTData);
        })(),
        // Non-critical: IM data
        (async () => {
          await imDataChar.startNotifications();
          imDataChar.addEventListener('characteristicvaluechanged', onIMData);
        })(),
        // Non-critical: Battery
        (async () => {
          await batteryChar.startNotifications();
          batteryChar.addEventListener('characteristicvaluechanged', onBatteryData);
        })(),
        // Non-critical: Charging
        (async () => {
          await chargingChar.startNotifications();
          chargingChar.addEventListener('characteristicvaluechanged', onChargingData);
        })()
      ]);

      // Check critical notifications (RT data)
      if (notificationResults[0].status === 'rejected') {
        logger.error('❌ Critical RT data re-establishment failed:', notificationResults[0].reason);
        throw new Error('Failed to re-establish critical RT data notifications');
      }

      // Log non-critical notification failures but continue
      const failureMessages = [];
      if (notificationResults[1].status === 'rejected') {
        logger.warn('⚠️ IM data re-establishment failed:', notificationResults[1].reason);
        failureMessages.push('IM data');
      }
      if (notificationResults[2].status === 'rejected') {
        logger.warn('⚠️ Battery re-establishment failed:', notificationResults[2].reason);
        failureMessages.push('Battery');
      }
      if (notificationResults[3].status === 'rejected') {
        logger.warn('⚠️ Charging re-establishment failed:', notificationResults[3].reason);
        failureMessages.push('Charging');
      }

      if (failureMessages.length > 0) {
        logger.warn(`⚠️ Some non-critical notifications failed to re-establish: ${failureMessages.join(', ')}`);
      }

      const successCount = notificationResults.filter(r => r.status === 'fulfilled').length;
      logger.debug(`📊 ${successCount}/4 notifications re-established`);

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
