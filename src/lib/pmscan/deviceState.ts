import { PMScanInternalState } from '@/types/sensor';

/**
 * Manages the internal state of a PMScan device
 */
export class PMScanDeviceState {
  public state: PMScanInternalState = {
    name: 'PMScanXXXXXX',
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

  public updateVersion(version: number): void {
    this.state.version = version;
  }

  public updateMode(mode: number): void {
    this.state.mode = mode;
  }

  public updateInterval(interval: number): void {
    this.state.interval = interval;
  }

  public updateDisplay(display: Uint8Array): void {
    this.state.display = new Uint8Array(display.buffer);
  }

  public updateName(name: string): void {
    this.state.name = name;
  }
}
