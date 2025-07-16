import { AIRBEAM_SERVICE_UUID, AIRBEAM_TX_UUID } from './constants';
import { AirBeamDeviceState } from './deviceState';
import { AirBeamDevice } from './types';
import * as logger from '@/utils/logger';

export class AirBeamDeviceInitializer {
  constructor(private deviceState: AirBeamDeviceState) {}

  public async initializeDevice(
    server: BluetoothRemoteGATTServer,
    device: BluetoothDevice,
    onData: (event: Event) => void
  ): Promise<{
    deviceInfo: AirBeamDevice;
    service: BluetoothRemoteGATTService;
  }> {
    logger.debug('✅ AirBeam Device Connected');

    const service = await server.getPrimaryService(AIRBEAM_SERVICE_UUID);

    const txChar = await service.getCharacteristic(AIRBEAM_TX_UUID);
    await txChar.startNotifications();
    txChar.addEventListener('characteristicvaluechanged', onData);

    const deviceInfo: AirBeamDevice = {
      name: device?.name || 'AirBeam Device',
      version: 0,
      mode: 0,
      interval: 0,
      battery: this.deviceState.state.battery,
      charging: this.deviceState.state.charging === 1,
      connected: true,
    };

    return { deviceInfo, service };
  }
}
