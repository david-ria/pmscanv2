import { AirBeamInternalState } from './types';

export class AirBeamDeviceState {
  public state: AirBeamInternalState = {
    name: 'AirBeam',
    version: 0,
    mode: 0,
    interval: 0,
    display: new Uint8Array(10),
    battery: 0,
    charging: 0,
    dataLogger: false,
    externalMemory: 0,
  };

  public updateBattery(level: number): void {
    this.state.battery = level;
  }

  public updateCharging(status: number): void {
    this.state.charging = status;
  }

  public updateName(name: string): void {
    this.state.name = name;
  }
}
