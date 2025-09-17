import { BleClient } from '@capacitor-community/bluetooth-le';
import { ensureBleReady } from './bleReady';
import { Capacitor } from '@capacitor/core';

export type FoundDevice = { deviceId: string; name?: string; rssi?: number };

// Cache the actual Web BluetoothDevice so we don't need to call requestDevice again
const webDeviceCache = new Map<string, BluetoothDevice>();
export function getWebBluetoothDeviceById(id: string) {
  return webDeviceCache.get(id);
}
export async function runBleScanCapacitor(timeoutMs = 10000, services?: string[]) {
  await ensureBleReady();
  const found: FoundDevice[] = [];

  // First attempt: scan with service UUID filter
  if (services && services.length > 0) {
    console.log('🔍 [BLE] Starting filtered scan with service UUIDs:', services);
    
    await BleClient.requestLEScan(
      { allowDuplicates: false, services },
      (result) => {
        const d = { deviceId: result.device.deviceId, name: result.device.name, rssi: result.rssi };
        if (!found.find(x => x.deviceId === d.deviceId)) found.push(d);
        console.log('[BLE] Found device (filtered):', d);
      }
    );

    await new Promise(res => setTimeout(res, timeoutMs));
    await BleClient.stopLEScan();

    // If devices found with filter, return them
    if (found.length > 0) {
      console.log(`✅ [BLE] Found ${found.length} device(s) with service filter`);
      return found;
    }

    console.log('⚠️ [BLE] No devices found with service filter, trying fallback scan...');
  }

  // Fallback: scan without service filter, rely on name filtering
  console.log('🔍 [BLE] Starting unfiltered scan (will filter by name)');
  
  await BleClient.requestLEScan(
    { allowDuplicates: false },
    (result) => {
      const d = { deviceId: result.device.deviceId, name: result.device.name, rssi: result.rssi };
      // Filter by PMScan name prefix
      if (d.name && d.name.includes('PMScan')) {
        if (!found.find(x => x.deviceId === d.deviceId)) found.push(d);
        console.log('[BLE] Found PMScan device (unfiltered):', d);
      }
    }
  );

  await new Promise(res => setTimeout(res, timeoutMs));
  await BleClient.stopLEScan();
  
  console.log(`${found.length > 0 ? '✅' : '❌'} [BLE] Fallback scan completed: ${found.length} PMScan device(s) found`);
  return found;
}

// Fallback Web pour le navigateur - utilise l'ancien code Web Bluetooth
export async function runBleScanWeb(services?: string[]) {
  if (!navigator.bluetooth) {
    throw new Error('Bluetooth not available in this browser');
  }

  console.log('Opening Web Bluetooth chooser via runBleScanWeb()');
  const device = await navigator.bluetooth.requestDevice({
    filters: [{ namePrefix: 'PMScan' }],
    optionalServices: services || [],
  });

  // Cache the selected device for later connection
  webDeviceCache.set(device.id, device);

  console.log('✅ [BLE Web] Device selected from chooser:', {
    id: device.id, 
    name: device.name 
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