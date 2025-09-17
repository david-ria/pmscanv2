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

// Android diagnostic flags (runtime toggles; Android native only)
const isAndroidNative = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
const getDiagFlag = (name: string): boolean => {
  try {
    const w: any = typeof globalThis !== 'undefined' ? (globalThis as any) : undefined;
    if (isAndroidNative && w && typeof w[name] !== 'undefined') {
      const val = w[name];
      return val === true || String(val).toLowerCase() === 'true' || val === 1 || val === '1';
    }
    if (typeof localStorage !== 'undefined') {
      const v = localStorage.getItem(name);
      if (v != null) return v === 'true' || v === '1';
    }
  } catch {}
  return false;
};
const ANDROID_SCAN_RAW_LOGS = isAndroidNative && getDiagFlag('ANDROID_SCAN_RAW_LOGS');
const ANDROID_SCAN_FORCE_UNFILTERED = isAndroidNative && getDiagFlag('ANDROID_SCAN_FORCE_UNFILTERED');
export async function runBleScanCapacitor(timeoutMs = SCAN_DURATION_MS, services?: string[]) {
  await ensureBleReady();
  const foundFiltered: FoundDevice[] = [];
  const foundFallback: FoundDevice[] = [];
  const allRawDevices: FoundDevice[] = [];
  const scanStartTime = Date.now();

  const namePrefix = "PMScan";

  // Phase 1: Filtered scan with service UUID + namePrefix (skip if ANDROID_SCAN_FORCE_UNFILTERED)
  if (services && services.length > 0 && !ANDROID_SCAN_FORCE_UNFILTERED) {
    safeBleDebugger.info('SCAN', '[BLE:SCAN] start (filtered)', undefined, { 
      serviceUuids: services, 
      namePrefix, 
      durationMs: timeoutMs,
      flags: { ANDROID_SCAN_RAW_LOGS, ANDROID_SCAN_FORCE_UNFILTERED }
    });
    
    const rawResultsFiltered: FoundDevice[] = [];
    
    await BleClient.requestLEScan(
      { allowDuplicates: false, services },
      (result) => {
        const d: FoundDevice = { 
          deviceId: result.device.deviceId, 
          name: result.device.name, 
          rssi: result.rssi,
          uuids: result.uuids 
        };
        
        // Store ALL raw results before any filtering
        if (!rawResultsFiltered.find(x => x.deviceId === d.deviceId)) {
          rawResultsFiltered.push(d);
        }
        
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

    // Log filtered results with raw data before filtering
    const filteredLogData: any = { 
      filteredDevices: foundFiltered.map(d => ({ id: d.deviceId, name: d.name, rssi: d.rssi, uuids: d.uuids })),
      count: foundFiltered.length,
      rawDevicesSeenBeforeFiltering: rawResultsFiltered.map(d => ({ id: d.deviceId, name: d.name, rssi: d.rssi, uuids: d.uuids })),
      totalRawBeforeFiltering: rawResultsFiltered.length
    };
    
    if (ANDROID_SCAN_RAW_LOGS) {
      filteredLogData.completeRawArrayBeforeFiltering = rawResultsFiltered;
    }
    
    safeBleDebugger.info('SCAN', '[BLE:SCAN] results (filtered)', undefined, filteredLogData);

    // If devices found with filter, use them but continue with fallback to see everything
    if (foundFiltered.length > 0) {
      safeBleDebugger.info('SCAN', `Found ${foundFiltered.length} device(s) with service filter, proceeding with fallback scan for complete visibility`);
    }
  } else if (ANDROID_SCAN_FORCE_UNFILTERED) {
    safeBleDebugger.info('SCAN', '[BLE:SCAN] start (filtered) - SKIPPED due to ANDROID_SCAN_FORCE_UNFILTERED flag', undefined, { 
      flags: { ANDROID_SCAN_RAW_LOGS, ANDROID_SCAN_FORCE_UNFILTERED }
    });
  }

  // Phase 2: Fallback scan without service filter
  safeBleDebugger.info('SCAN', '[BLE:SCAN] start (fallback)', undefined, { 
    serviceUuids: [], 
    namePrefix, 
    durationMs: timeoutMs,
    flags: { ANDROID_SCAN_RAW_LOGS, ANDROID_SCAN_FORCE_UNFILTERED }
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
  
  // Log fallback results with complete raw data
  const fallbackLogData: any = { 
    filteredDevices: foundFallback.map(d => ({ id: d.deviceId, name: d.name, rssi: d.rssi, uuids: d.uuids })),
    count: foundFallback.length,
    rawDevicesSeenBeforeFiltering: allRawDevices.map(d => ({ id: d.deviceId, name: d.name, rssi: d.rssi, uuids: d.uuids })),
    totalRawBeforeFiltering: allRawDevices.length
  };
  
  if (ANDROID_SCAN_RAW_LOGS) {
    fallbackLogData.completeRawArrayBeforeFiltering = allRawDevices;
  }
  
  safeBleDebugger.info('SCAN', '[BLE:SCAN] results (fallback)', undefined, fallbackLogData);

  // Deduplicate by deviceId: combine filtered + fallback results
  const allFound = [...foundFiltered];
  const deduplicationLog: any[] = [];
  
  foundFallback.forEach(fallbackDevice => {
    if (!allFound.find(x => x.deviceId === fallbackDevice.deviceId)) {
      allFound.push(fallbackDevice);
      deduplicationLog.push({ action: 'added_from_fallback', device: { id: fallbackDevice.deviceId, name: fallbackDevice.name } });
    } else {
      deduplicationLog.push({ action: 'skipped_duplicate', device: { id: fallbackDevice.deviceId, name: fallbackDevice.name } });
    }
  });

  const scanEndTime = Date.now();
  const totalScanDuration = scanEndTime - scanStartTime;

  // Summary log with detailed deduplication info
  const summaryLogData: any = { 
    totalDeduplicated: allFound.length,
    filteredCount: foundFiltered.length,
    fallbackCount: foundFallback.length,
    deviceChosen: allFound.length > 0 ? 'picker-will-show' : 'none',
    finalDevices: allFound.map(d => ({ id: d.deviceId, name: d.name, rssi: d.rssi })),
    effectiveScanDurationMs: totalScanDuration,
    configuredDurationMs: timeoutMs,
    flags: { ANDROID_SCAN_RAW_LOGS, ANDROID_SCAN_FORCE_UNFILTERED }
  };
  
  if (ANDROID_SCAN_RAW_LOGS) {
    summaryLogData.deduplicationDetails = deduplicationLog;
  }
  
  safeBleDebugger.info('SCAN', '[BLE:SCAN] summary', undefined, summaryLogData);
  
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