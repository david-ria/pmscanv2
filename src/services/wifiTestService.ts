import { storageService, STORAGE_KEYS } from '@/services/storageService';
import * as logger from '@/utils/logger';

class WiFiTestService {
  private static instance: WiFiTestService;

  static getInstance(): WiFiTestService {
    if (!WiFiTestService.instance) {
      WiFiTestService.instance = new WiFiTestService();
    }
    return WiFiTestService.instance;
  }

  setTestWifi(ssid: string): boolean {
    const success = storageService.set(STORAGE_KEYS.MOCK_WIFI_SSID, ssid);
    if (success) {
      logger.debug('🧪 Test WiFi SSID set:', ssid);
    } else {
      logger.error('❌ Failed to set test WiFi SSID');
    }
    return success;
  }

  clearTestWifi(): boolean {
    const success = storageService.remove(STORAGE_KEYS.MOCK_WIFI_SSID);
    if (success) {
      logger.debug('🧹 Test WiFi SSID cleared');
    } else {
      logger.error('❌ Failed to clear test WiFi SSID');
    }
    return success;
  }

  getTestWifi(): string | null {
    return storageService.get<string>(STORAGE_KEYS.MOCK_WIFI_SSID);
  }

  hasTestWifi(): boolean {
    return storageService.exists(STORAGE_KEYS.MOCK_WIFI_SSID);
  }

  getCurrentWifiSSID(): string {
    // Check for test WiFi SSID first
    const testWifi = this.getTestWifi();
    if (testWifi) {
      return testWifi;
    }

    // In a real implementation, this would use Capacitor's Network plugin
    // For now, we'll return a mock value only if online
    return navigator.onLine ? 'MockWiFi' : '';
  }
}

export const wifiTestService = WiFiTestService.getInstance();