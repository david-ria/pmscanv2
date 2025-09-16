import { BleClient } from '@capacitor-community/bluetooth-le';
import { ensureBleReady } from './bleReady';
import { Capacitor } from '@capacitor/core';

export type FoundDevice = { deviceId: string; name?: string; rssi?: number };

export async function runBleScanCapacitor(timeoutMs = 10000, services?: string[]) {
  await ensureBleReady();
  const found: FoundDevice[] = [];

  await BleClient.requestLEScan(
    { allowDuplicates: false, services },
    (result) => {
      const d = { deviceId: result.device.deviceId, name: result.device.name, rssi: result.rssi };
      if (!found.find(x => x.deviceId === d.deviceId)) found.push(d);
      console.log('[BLE] found:', d);
    }
  );

  await new Promise(res => setTimeout(res, timeoutMs));
  await BleClient.stopLEScan();
  return found;
}

// Fallback Web pour le navigateur - utilise l'ancien code Web Bluetooth
export async function runBleScanWeb(services?: string[]) {
  if (!navigator.bluetooth) {
    throw new Error('Bluetooth not available in this browser');
  }

  console.log('🔍 Requesting any Bluetooth device...');
  const device = await navigator.bluetooth.requestDevice({
    filters: [{ namePrefix: 'PMScan' }],
    optionalServices: services || [],
  });

  return [{
    deviceId: device.id,
    name: device.name,
    rssi: undefined // Web Bluetooth doesn't provide RSSI during scan
  }];
}

export async function runBleScan({ timeoutMs = 10000, services }: { timeoutMs?: number; services?: string[] } = {}) {
  if (Capacitor.isNativePlatform()) {
    return runBleScanCapacitor(timeoutMs, services);
  }
  return runBleScanWeb(services);
}