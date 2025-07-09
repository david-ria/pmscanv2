import { AirBeamState } from './types';

export class AirBeamDeviceState {
  private _state: AirBeamState;

  constructor() {
    this._state = {
      sessionId: '',
      battery: 100,
      charging: false,
      version: 'Unknown'
    };
  }

  public get state(): AirBeamState {
    return this._state;
  }

  public updateSessionId(sessionId: string): void {
    this._state.sessionId = sessionId;
  }

  public updateBattery(level: number): void {
    this._state.battery = Math.max(0, Math.min(100, level));
  }

  public updateCharging(status: number): void {
    this._state.charging = status === 1;
  }

  public updateVersion(version: string): void {
    this._state.version = version;
  }

  public reset(): void {
    this._state = {
      sessionId: '',
      battery: 100,
      charging: false,
      version: 'Unknown'
    };
  }
}