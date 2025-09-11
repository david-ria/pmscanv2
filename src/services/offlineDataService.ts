import { PMScanData } from '@/lib/pmscan/types';
import { LocationData } from '@/types/PMScan';
import * as logger from '@/utils/logger';

export interface OfflineDataItem {
  id: string;
  type: 'air-quality' | 'mission' | 'settings';
  data: any;
  timestamp: number;
  synced: boolean;
  retryCount: number;
}

class OfflineDataService {
  private readonly DB_NAME = 'pmscan-offline';
  private readonly DB_VERSION = 1;
  private readonly STORES = ['air-quality', 'missions', 'settings'];

  private async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        this.STORES.forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: 'id' });
            store.createIndex('timestamp', 'timestamp', { unique: false });
            store.createIndex('synced', 'synced', { unique: false });
          }
        });
      };
    });
  }

  async storeAirQualityData(pmData: PMScanData, location?: LocationData, context?: any): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction(['air-quality'], 'readwrite');
      const store = transaction.objectStore('air-quality');
      
      const item: OfflineDataItem = {
        id: `aq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'air-quality',
        data: { pmData, location, context },
        timestamp: Date.now(),
        synced: false,
        retryCount: 0
      };
      
      await store.add(item);
      logger.debug('🗄️ Air quality data stored offline', { id: item.id });
    } catch (error) {
      logger.error('Failed to store air quality data offline', error);
    }
  }

  async storeMissionData(missionData: any): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction(['missions'], 'readwrite');
      const store = transaction.objectStore('missions');
      
      const item: OfflineDataItem = {
        id: `mission_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'mission',
        data: missionData,
        timestamp: Date.now(),
        synced: false,
        retryCount: 0
      };
      
      await store.add(item);
      logger.debug('🗄️ Mission data stored offline', { id: item.id });
    } catch (error) {
      logger.error('Failed to store mission data offline', error);
    }
  }

  async getUnsyncedData(type?: 'air-quality' | 'missions' | 'settings'): Promise<OfflineDataItem[]> {
    try {
      const db = await this.openDB();
      const stores = type ? [type] : this.STORES;
      const results: OfflineDataItem[] = [];
      
      for (const storeName of stores) {
        try {
          const transaction = db.transaction([storeName], 'readonly');
          const store = transaction.objectStore(storeName);
          
          // Check if the index exists before using it
          if (!store.indexNames.contains('synced')) {
            logger.warn(`Index 'synced' not found in store '${storeName}', skipping`);
            continue;
          }
          
          const index = store.index('synced');
          const request = index.getAll(IDBKeyRange.only(false));
          
          const items = await new Promise<OfflineDataItem[]>((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          });
          
          results.push(...items);
        } catch (storeError) {
          logger.warn(`Failed to access store '${storeName}':`, storeError);
          continue;
        }
      }
      
      return results.sort((a, b) => a.timestamp - b.timestamp);
    } catch (error) {
      logger.error('Failed to get unsynced data', error);
      return [];
    }
  }

  async markAsSynced(id: string, storeName: string): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      const getRequest = store.get(id);
      const item = await new Promise<OfflineDataItem>((resolve, reject) => {
        getRequest.onsuccess = () => resolve(getRequest.result);
        getRequest.onerror = () => reject(getRequest.error);
      });
      
      if (item) {
        item.synced = true;
        await store.put(item);
        logger.debug('✅ Data marked as synced', { id });
      }
    } catch (error) {
      logger.error('Failed to mark data as synced', error);
    }
  }

  async incrementRetryCount(id: string, storeName: string): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      const getRequest = store.get(id);
      const item = await new Promise<OfflineDataItem>((resolve, reject) => {
        getRequest.onsuccess = () => resolve(getRequest.result);
        getRequest.onerror = () => reject(getRequest.error);
      });
      
      if (item) {
        item.retryCount = (item.retryCount || 0) + 1;
        await store.put(item);
      }
    } catch (error) {
      logger.error('Failed to increment retry count', error);
    }
  }

  async clearSyncedData(olderThanHours = 24): Promise<void> {
    try {
      const db = await this.openDB();
      const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000);
      
      for (const storeName of this.STORES) {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const index = store.index('timestamp');
        const range = IDBKeyRange.upperBound(cutoffTime);
        const request = index.openCursor(range);
        
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            const item = cursor.value as OfflineDataItem;
            if (item.synced) {
              cursor.delete();
            }
            cursor.continue();
          }
        };
      }
      
      logger.debug('🧹 Cleaned up old synced data');
    } catch (error) {
      logger.error('Failed to clean up synced data', error);
    }
  }

  async getStorageStats(): Promise<{ totalItems: number; unsyncedItems: number; storageSize: number }> {
    try {
      const db = await this.openDB();
      let totalItems = 0;
      let unsyncedItems = 0;
      
      for (const storeName of this.STORES) {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const countRequest = store.count();
        const total = await new Promise<number>((resolve) => {
          countRequest.onsuccess = () => resolve(countRequest.result);
        });
        
        // Check if the index exists before using it
        let unsynced = 0;
        if (store.indexNames.contains('synced')) {
          const unsyncedIndex = store.index('synced');
          const unsyncedRequest = unsyncedIndex.getAll(IDBKeyRange.only(false));
          unsynced = await new Promise<number>((resolve, reject) => {
            unsyncedRequest.onsuccess = () => resolve(unsyncedRequest.result.length);
            unsyncedRequest.onerror = () => resolve(0); // Fallback to 0 on error
          });
        }
        
        totalItems += total;
        unsyncedItems += unsynced;
      }
      
      // Estimate storage size (rough calculation)
      const storageSize = await this.estimateStorageSize();
      
      return { totalItems, unsyncedItems, storageSize };
    } catch (error) {
      logger.error('Failed to get storage stats', error);
      return { totalItems: 0, unsyncedItems: 0, storageSize: 0 };
    }
  }

  private async estimateStorageSize(): Promise<number> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        return estimate.usage || 0;
      } catch (error) {
        return 0;
      }
    }
    return 0;
  }
}

export const offlineDataService = new OfflineDataService();