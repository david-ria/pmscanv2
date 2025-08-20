import * as logger from '@/utils/logger';

// Storage keys as constants to avoid typos
export const STORAGE_KEYS = {
  // Core settings
  AUTO_CONTEXT_SETTINGS: 'autoContextSettings',
  ALERT_SETTINGS: 'alertSettings',
  GLOBAL_ALERTS_ENABLED: 'globalAlertsEnabled',
  AIR_QUALITY_THRESHOLDS: 'airQualityThresholds',
  WEATHER_LOGGING: 'weatherLoggingEnabled',
  GEOHASH_SETTINGS: 'geohashSettings',
  
  // Mission and data storage
  MISSIONS: 'missions',
  PENDING_SYNC: 'pendingSync',
  CRASH_RECOVERY: 'crashRecoveryData',
  UNSENT_CSV: 'unsentCSVData',
  
  // Map and context
  MAP_STATE: 'mapState',
  WIFI_TIME_TRACKING: 'wifiTimeTracking',
  
  // Group settings
  ACTIVE_GROUP_ID: 'activeGroupId',
  GROUP_SETTINGS: 'groupSettings',
} as const;

interface StorageOptions<T = unknown> {
  defaultValue?: T;
  parser?: (value: string) => T;
  serializer?: (value: T) => string;
}

class StorageService {
  private static instance: StorageService;

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  get<T>(key: string, options?: StorageOptions<T>): T | null {
    try {
      const value = localStorage.getItem(key);
      if (value === null) {
        return (options?.defaultValue ?? null) as T | null;
      }

      if (options?.parser) {
        return options.parser(value);
      }

      // Try to parse as JSON, fallback to string
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as unknown as T;
      }
    } catch (error) {
      logger.error(`Failed to get storage item "${key}":`, error as Error);
      return (options?.defaultValue ?? null) as T | null;
    }
  }

  set<T>(key: string, value: T, options?: StorageOptions): boolean {
    try {
      const serializedValue = options?.serializer 
        ? options.serializer(value)
        : JSON.stringify(value);
      
      localStorage.setItem(key, serializedValue);
      return true;
    } catch (error) {
      logger.error(`Failed to set storage item "${key}":`, error);
      return false;
    }
  }

  remove(key: string): boolean {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      logger.error(`Failed to remove storage item "${key}":`, error);
      return false;
    }
  }

  clear(): boolean {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      logger.error('Failed to clear localStorage:', error);
      return false;
    }
  }

  exists(key: string): boolean {
    return localStorage.getItem(key) !== null;
  }

  // Typed methods for common storage patterns
  getSettings<T extends Record<string, any>>(key: string, defaultSettings: T): T {
    const stored = this.get<T>(key);
    return stored ? { ...defaultSettings, ...stored } : defaultSettings;
  }

  setSettings<T extends Record<string, any>>(key: string, settings: T): boolean {
    return this.set(key, settings);
  }

  updateSettings<T extends Record<string, any>>(
    key: string, 
    updates: Partial<T>, 
    defaultSettings: T
  ): boolean {
    const currentSettings = this.getSettings(key, defaultSettings);
    const newSettings = { ...currentSettings, ...updates };
    return this.setSettings(key, newSettings);
  }

  // Array operations
  getArray<T>(key: string): T[] {
    return this.get<T[]>(key) ?? [];
  }

  setArray<T>(key: string, array: T[]): boolean {
    return this.set(key, array);
  }

  pushToArray<T>(key: string, item: T): boolean {
    const array = this.getArray<T>(key);
    array.push(item);
    return this.setArray(key, array);
  }

  removeFromArray<T>(key: string, predicate: (item: T) => boolean): boolean {
    const array = this.getArray<T>(key);
    const filtered = array.filter(item => !predicate(item));
    return this.setArray(key, filtered);
  }

  // Boolean operations
  getBoolean(key: string, defaultValue: boolean = false): boolean {
    const value = this.get<string>(key);
    if (value === null) return defaultValue;
    return value === 'true';
  }

  setBoolean(key: string, value: boolean): boolean {
    return this.set(key, value.toString());
  }

  toggleBoolean(key: string, defaultValue: boolean = false): boolean {
    const current = this.getBoolean(key, defaultValue);
    const newValue = !current;
    this.setBoolean(key, newValue);
    return newValue;
  }

  // Utility methods
  getKeys(): string[] {
    return Object.keys(localStorage);
  }

  getSize(): number {
    return this.getKeys().length;
  }

  getUsedSpace(): number {
    let total = 0;
    for (const key of this.getKeys()) {
      const value = localStorage.getItem(key);
      if (value) {
        total += key.length + value.length;
      }
    }
    return total;
  }

  // Debug methods
  dump(): Record<string, any> {
    const result: Record<string, any> = {};
    for (const key of this.getKeys()) {
      result[key] = this.get(key);
    }
    return result;
  }

  logStats(): void {
    logger.debug('📊 Storage Stats:', {
      keys: this.getSize(),
      usedSpace: `${(this.getUsedSpace() / 1024).toFixed(2)} KB`,
      availableKeys: Object.keys(STORAGE_KEYS)
    });
  }
}

// Export singleton instance
export const storageService = StorageService.getInstance();