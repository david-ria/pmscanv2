import { BleClient } from '@capacitor-community/bluetooth-le';
import { Capacitor } from '@capacitor/core';

let initialized = false;
let initInFlight: Promise<void> | null = null;

async function doInit() {
  if (!initialized) {
    console.log('[BLE] initialize()');
    await BleClient.initialize();
    initialized = true;
  }

  if (Capacitor.isNativePlatform()) {
    try {
      console.log('[BLE] requestPermissions()');
      // @ts-ignore
      if (typeof (BleClient as any).requestPermissions === 'function') {
        await (BleClient as any).requestPermissions();
      }
    } catch (e) {
      console.warn('[BLE] requestPermissions failed or not needed:', e);
    }

    try {
      const enabled = await BleClient.isEnabled();
      console.log('[BLE] isEnabled =', enabled);
      if (!enabled) {
        // @ts-ignore
        if (typeof (BleClient as any).enableBluetooth === 'function') {
          console.log('[BLE] enableBluetooth()');
          // @ts-ignore
          await (BleClient as any).enableBluetooth();
        } else if (typeof (BleClient as any).openBluetoothSettings === 'function') {
          console.log('[BLE] openBluetoothSettings()');
          await (BleClient as any).openBluetoothSettings();
        } else {
          console.warn('[BLE] No enableBluetooth/openBluetoothSettings API available.');
        }
      }
    } catch (e) {
      console.warn('[BLE] enable check failed:', e);
    }
  }
}

export async function ensureBleReady(): Promise<void> {
  if (initialized) return;
  if (!initInFlight) initInFlight = doInit().finally(() => (initInFlight = null));
  return initInFlight;
}