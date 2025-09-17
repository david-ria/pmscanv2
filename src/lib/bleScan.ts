import { BleClient } from '@capacitor-community/bluetooth-le';
import { ensureBleReady } from './bleReady';
import { Capacitor } from '@capacitor/core';
import { safeBleDebugger } from './bleSafeWrapper';

export type FoundDevice = { deviceId: string; name?: string; rssi?: number; uuids?: string[] };

// Configurable scan duration
export const SCAN_DURATION_MS = 10000;

// Cache the actual Web BluetoothDevice so we don't need to call requestDevice again
const webDeviceCache = new Map<string, BluetoothDevice>();
export function getWebBluetoothDeviceById(id: string) {
  return webDeviceCache.get(id);
}
export async function runBleScanCapacitor(timeoutMs = SCAN_DURATION_MS, services?: string[]) {
  await ensureBleReady();
  const foundFiltered: FoundDevice[] = [];
  const foundFallback: FoundDevice[] = [];
  const allRawDevices: FoundDevice[] = [];

  const namePrefix = "PMScan";

  // Phase 1: Filtered scan with service UUID + namePrefix
  if (services && services.length > 0) {
    safeBleDebugger.info('SCAN', '[BLE:SCAN] start (filtered)', undefined, { 
      serviceUuids: services, 
      namePrefix, 
      durationMs: timeoutMs 
    });
    
    await BleClient.requestLEScan(
      { allowDuplicates: false, services },
      (result) => {
        const d: FoundDevice = { 
          deviceId: result.device.deviceId, 
          name: result.device.name, 
          rssi: result.rssi,
          uuids: result.uuids 
        };
        
        // Add to filtered results if matches name prefix and not already added
        if (d.name && d.name.includes(namePrefix)) {
          if (!foundFiltered.find(x => x.deviceId === d.deviceId)) {
            foundFiltered.push(d);
          }
        }
      }
    );

    await new Promise(res => setTimeout(res, timeoutMs));
    await BleClient.stopLEScan();

    // Log filtered results (even if 0)
    const filteredResults = foundFiltered.map(d => ({ 
      id: d.deviceId, 
      name: d.name, 
      rssi: d.rssi, 
      uuids: d.uuids 
    }));
    safeBleDebugger.info('SCAN', '[BLE:SCAN] results (filtered)', undefined, { 
      devices: filteredResults, 
      count: foundFiltered.length 
    });

    // If devices found with filter, use them but continue with fallback to see everything
    if (foundFiltered.length > 0) {
      safeBleDebugger.info('SCAN', `Found ${foundFiltered.length} device(s) with service filter, proceeding with fallback scan for complete visibility`);
    }
  }

  // Phase 2: Fallback scan without service filter
  safeBleDebugger.info('SCAN', '[BLE:SCAN] start (fallback)', undefined, { 
    serviceUuids: [], 
    namePrefix, 
    durationMs: timeoutMs 
  });
  
  await BleClient.requestLEScan(
    { allowDuplicates: false },
    (result) => {
      const d: FoundDevice = { 
        deviceId: result.device.deviceId, 
        name: result.device.name, 
        rssi: result.rssi,
        uuids: result.uuids 
      };
      
      // Log ALL devices found (raw list for debugging)
      if (!allRawDevices.find(x => x.deviceId === d.deviceId)) {
        allRawDevices.push(d);
      }
      
      // Filter by PMScan name prefix for fallback results
      if (d.name && d.name.includes(namePrefix)) {
        if (!foundFallback.find(x => x.deviceId === d.deviceId)) {
          foundFallback.push(d);
        }
      }
    }
  );

  await new Promise(res => setTimeout(res, timeoutMs));
  await BleClient.stopLEScan();
  
  // Log raw device list (all devices seen by phone)
  const rawResults = allRawDevices.map(d => ({ 
    id: d.deviceId, 
    name: d.name, 
    rssi: d.rssi, 
    uuids: d.uuids 
  }));
  
  // Log fallback results with raw list
  safeBleDebugger.info('SCAN', '[BLE:SCAN] results (fallback)', undefined, { 
    devices: foundFallback.map(d => ({ id: d.deviceId, name: d.name, rssi: d.rssi, uuids: d.uuids })),
    count: foundFallback.length,
    rawDevicesSeen: rawResults,
    totalRawCount: allRawDevices.length
  });

  // Deduplicate by deviceId: combine filtered + fallback results
  const allFound = [...foundFiltered];
  foundFallback.forEach(fallbackDevice => {
    if (!allFound.find(x => x.deviceId === fallbackDevice.deviceId)) {
      allFound.push(fallbackDevice);
    }
  });

  // Summary log
  safeBleDebugger.info('SCAN', '[BLE:SCAN] summary', undefined, { 
    totalDeduplicated: allFound.length,
    filteredCount: foundFiltered.length,
    fallbackCount: foundFallback.length,
    deviceChosen: allFound.length > 0 ? 'picker-will-show' : 'none',
    finalDevices: allFound.map(d => ({ id: d.deviceId, name: d.name, rssi: d.rssi }))
  });
  
  return allFound;
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

export async function runBleScan({ timeoutMs = SCAN_DURATION_MS, services }: { timeoutMs?: number; services?: string[] } = {}) {
  if (Capacitor.isNativePlatform()) {
    return runBleScanCapacitor(timeoutMs, services);
  }
  return runBleScanWeb(services);
}