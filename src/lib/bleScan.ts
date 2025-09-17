import { BleClient } from '@capacitor-community/bluetooth-le';
import { ensureBleReady } from './bleReady';
import { Capacitor } from '@capacitor/core';
import { safeBleDebugger } from './bleSafeWrapper';

export type FoundDevice = {
  deviceId: string;
  name?: string;
  rssi?: number;
  uuids?: string[];
};

// Durée de scan (ms)
export const SCAN_DURATION_MS = 10_000;

// ---- Cache Web Bluetooth (pour éviter de redemander le chooser)
const webDeviceCache = new Map<string, BluetoothDevice>();
export function getWebBluetoothDeviceById(id: string) {
  return webDeviceCache.get(id);
}

// ---- Flags de diagnostic (android natif uniquement), togglables via localStorage ou window.*
const isAndroidNative =
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

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
const ANDROID_SCAN_FORCE_UNFILTERED =
  isAndroidNative && getDiagFlag('ANDROID_SCAN_FORCE_UNFILTERED');

// ---- Scan Android (Capacitor)
export async function runBleScanCapacitor(
  timeoutMs: number = SCAN_DURATION_MS,
  services?: string[]
): Promise<FoundDevice[]> {
  await ensureBleReady();

  const foundFiltered: FoundDevice[] = [];
  const foundFallback: FoundDevice[] = [];
  const allRawDevices: FoundDevice[] = [];
  const scanStartTime = Date.now();
  const namePrefix = 'PMScan';

  // Phase 1 : scan filtré par service + namePrefix (sauf si flag UNFILTERED)
  if (services && services.length > 0 && !ANDROID_SCAN_FORCE_UNFILTERED) {
    safeBleDebugger.info('SCAN', '[BLE:SCAN] start (filtered)', undefined, {
      serviceUuids: services,
      namePrefix,
      durationMs: timeoutMs,
      flags: { ANDROID_SCAN_RAW_LOGS, ANDROID_SCAN_FORCE_UNFILTERED },
    });

    const rawResultsFiltered: FoundDevice[] = [];

    try {
      await BleClient.requestLEScan(
        { allowDuplicates: false, services },
        (result) => {
          const d: FoundDevice = {
            deviceId: result.device.deviceId,
            name: result.device.name,
            rssi: result.rssi,
            uuids: result.uuids,
          };

          if (!rawResultsFiltered.find((x) => x.deviceId === d.deviceId)) {
            rawResultsFiltered.push(d);
          }
          if (d.name && d.name.includes(namePrefix)) {
            if (!foundFiltered.find((x) => x.deviceId === d.deviceId)) {
              foundFiltered.push(d);
            }
          }
        }
      );

      await new Promise((res) => setTimeout(res, timeoutMs));
    } finally {
      try {
        await BleClient.stopLEScan();
      } catch {}
    }

    const filteredLogData: any = {
      filteredDevices: foundFiltered.map((d) => ({
        id: d.deviceId,
        name: d.name,
        rssi: d.rssi,
        uuids: d.uuids,
      })),
      count: foundFiltered.length,
      rawDevicesSeenBeforeFiltering: rawResultsFiltered.map((d) => ({
        id: d.deviceId,
        name: d.name,
        rssi: d.rssi,
        uuids: d.uuids,
      })),
      totalRawBeforeFiltering: rawResultsFiltered.length,
    };
    if (ANDROID_SCAN_RAW_LOGS) filteredLogData.completeRawArrayBeforeFiltering = rawResultsFiltered;

    safeBleDebugger.info('SCAN', '[BLE:SCAN] results (filtered)', undefined, filteredLogData);

    if (foundFiltered.length > 0) {
      safeBleDebugger.info(
        'SCAN',
        `Found ${foundFiltered.length} device(s) with service filter; running fallback for full visibility`
      );
    }
  } else if (ANDROID_SCAN_FORCE_UNFILTERED) {
    safeBleDebugger.info(
      'SCAN',
      '[BLE:SCAN] start (filtered) - SKIPPED due to ANDROID_SCAN_FORCE_UNFILTERED',
      undefined,
      { flags: { ANDROID_SCAN_RAW_LOGS, ANDROID_SCAN_FORCE_UNFILTERED } }
    );
  }

  // Phase 2 : scan fallback non filtré
  safeBleDebugger.info('SCAN', '[BLE:SCAN] start (fallback)', undefined, {
    serviceUuids: [],
    namePrefix,
    durationMs: timeoutMs,
    flags: { ANDROID_SCAN_RAW_LOGS, ANDROID_SCAN_FORCE_UNFILTERED },
  });

  try {
    await BleClient.requestLEScan({ allowDuplicates: false }, (result) => {
      const d: FoundDevice = {
        deviceId: result.device.deviceId,
        name: result.device.name,
        rssi: result.rssi,
        uuids: result.uuids,
      };

      if (!allRawDevices.find((x) => x.deviceId === d.deviceId)) {
        allRawDevices.push(d);
      }
      if (d.name && d.name.includes(namePrefix)) {
        if (!foundFallback.find((x) => x.deviceId === d.deviceId)) {
          foundFallback.push(d);
        }
      }
    });

    await new Promise((res) => setTimeout(res, timeoutMs));
  } finally {
    try {
      await BleClient.stopLEScan();
    } catch {}
  }

  const fallbackLogData: any = {
    filteredDevices: foundFallback.map((d) => ({
      id: d.deviceId,
      name: d.name,
      rssi: d.rssi,
      uuids: d.uuids,
    })),
    count: foundFallback.length,
    rawDevicesSeenBeforeFiltering: allRawDevices.map((d) => ({
      id: d.deviceId,
      name: d.name,
      rssi: d.rssi,
      uuids: d.uuids,
    })),
    totalRawBeforeFiltering: allRawDevices.length,
  };
  if (ANDROID_SCAN_RAW_LOGS) fallbackLogData.completeRawArrayBeforeFiltering = allRawDevices;

  safeBleDebugger.info('SCAN', '[BLE:SCAN] results (fallback)', undefined, fallbackLogData);

  // Déduplication (filtered + fallback)
  const allFound = [...foundFiltered];
  const dedupDetails: any[] = [];

  for (const dev of foundFallback) {
    if (!allFound.find((x) => x.deviceId === dev.deviceId)) {
      allFound.push(dev);
      if (ANDROID_SCAN_RAW_LOGS) dedupDetails.push({ action: 'added_from_fallback', id: dev.deviceId });
    } else if (ANDROID_SCAN_RAW_LOGS) {
      dedupDetails.push({ action: 'skipped_duplicate', id: dev.deviceId });
    }
  }

  const summaryLogData: any = {
    totalDeduplicated: allFound.length,
    filteredCount: foundFiltered.length,
    fallbackCount: foundFallback.length,
    deviceChosen: allFound.length > 0 ? 'picker-will-show' : 'none',
    finalDevices: allFound.map((d) => ({ id: d.deviceId, name: d.name, rssi: d.rssi })),
    effectiveScanDurationMs: Date.now() - scanStartTime,
    configuredDurationMs: timeoutMs,
    flags: { ANDROID_SCAN_RAW_LOGS, ANDROID_SCAN_FORCE_UNFILTERED },
  };
  if (ANDROID_SCAN_RAW_LOGS) summaryLogData.deduplicationDetails = dedupDetails;

  safeBleDebugger.info('SCAN', '[BLE:SCAN] summary', undefined, summaryLogData);

  return allFound;
}

// ---- Scan Web (ouvre le chooser navigateur)
export async function runBleScanWeb(services?: string[]): Promise<FoundDevice[]> {
  if (!navigator.bluetooth) throw new Error('Bluetooth not available in this browser');

  console.log('Opening Web Bluetooth chooser via runBleScanWeb()');

  const device = await navigator.bluetooth.requestDevice({
    filters: [{ namePrefix: 'PMScan' }],
    optionalServices: services || [],
  });

  webDeviceCache.set(device.id, device);

  console.log('✅ [BLE Web] Device selected from chooser:', { id: device.id, name: device.name });

  return [
    {
      deviceId: device.id,
      name: device.name || undefined,
      rssi: undefined, // Web Bluetooth ne fournit pas le RSSI au scan
    },
  ];
}

// ---- Entrée unifiée
export async function runBleScan(opts: {
  timeoutMs?: number;
  services?: string[];
} = {}): Promise<FoundDevice[]> {
  const { timeoutMs = SCAN_DURATION_MS, services } = opts;
  return Capacitor.isNativePlatform()
    ? runBleScanCapacitor(timeoutMs, services)
    : runBleScanWeb(services);
}
