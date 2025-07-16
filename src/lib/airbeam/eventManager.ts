import { AIRBEAM_TX_UUID } from './constants';
import { AirBeamDeviceState } from './deviceState';
import { AirBeamDevice } from './types';
import * as logger from '@/utils/logger';

export class AirBeamEventManager {
  constructor(private deviceState: AirBeamDeviceState) {}

  public async reestablishEventListeners(
    service: BluetoothRemoteGATTService,
    device: BluetoothDevice,
    onData: (event: Event) => void
  ): Promise<AirBeamDevice | null> {
    try {
      const txChar = await service.getCharacteristic(AIRBEAM_TX_UUID);

      txChar.removeEventListener('characteristicvaluechanged', onData);
      await txChar.startNotifications();
      txChar.addEventListener('characteristicvaluechanged', onData);

      logger.debug('🔄 AirBeam event listeners re-established');

      return {
        name: device?.name || 'AirBeam Device',
        version: this.deviceState.state.version,
        mode: this.deviceState.state.mode,
        interval: this.deviceState.state.interval,
        battery: this.deviceState.state.battery,
        charging: this.deviceState.state.charging === 1,
        connected: true,
      };
    } catch (error) {
      console.error('❌ Failed to re-establish AirBeam listeners:', error);
      return null;
    }
  }
}
