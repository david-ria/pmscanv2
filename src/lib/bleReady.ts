// src/lib/bleReady.ts
import { BleClient } from '@capacitor-community/bluetooth-le';

export async function ensureBleReady() {
  try {
    // 1) Init BLE (idempotent)
    await BleClient.initialize();
    console.log('[BLE] Initialized successfully');

    // 3) Active le Bluetooth si OFF (ouvre le dialogue système)
    const enabled = await BleClient.isEnabled();
    if (!enabled) {
      await BleClient.enable();
    }
  } catch (e) {
    // Log doux (évite de crasher l'app si l'utilisateur refuse)
    console.warn('[BLE] init/permissions skipped or failed:', e);
  }
}
