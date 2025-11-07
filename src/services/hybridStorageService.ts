/**
 * Hybrid Storage Service
 * 
 * Optimizes storage by using:
 * - localStorage: Small metadata (<1KB)
 * - IndexedDB: Large measurements data (>1KB)
 * 
 * This prevents localStorage saturation and improves performance
 */

import { MissionData, MeasurementData } from '@/lib/dataStorage';
import logger from '@/utils/logger';

const DB_NAME = 'PMScan_HybridStorage';
const DB_VERSION = 1;
const MEASUREMENTS_STORE = 'measurements';
const MISSIONS_STORE = 'missions';

class HybridStorageService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize IndexedDB
   */
  private async initDB(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        logger.error('Failed to open IndexedDB', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        logger.info('✅ IndexedDB initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store for measurements (large data)
        if (!db.objectStoreNames.contains(MEASUREMENTS_STORE)) {
          const measurementsStore = db.createObjectStore(MEASUREMENTS_STORE, { keyPath: 'missionId' });
          measurementsStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Store for mission blobs (full missions for export)
        if (!db.objectStoreNames.contains(MISSIONS_STORE)) {
          const missionsStore = db.createObjectStore(MISSIONS_STORE, { keyPath: 'id' });
          missionsStore.createIndex('timestamp', 'startTime', { unique: false });
        }

        logger.info('📦 IndexedDB object stores created');
      };
    });

    return this.initPromise;
  }

  /**
   * Save mission with hybrid approach
   * - Metadata in localStorage (fast access)
   * - Measurements in IndexedDB (large data)
   */
  async saveMission(mission: MissionData): Promise<void> {
    try {
      await this.initDB();

      // Extract metadata (small data for localStorage)
      const metadata = {
        id: mission.id,
        name: mission.name,
        startTime: mission.startTime,
        endTime: mission.endTime,
        duration: mission.durationMinutes,
        avgPm25: mission.avgPm25,
        avgPm10: mission.avgPm10,
        avgPm1: mission.avgPm1,
        maxPm25: mission.maxPm25,
        measurementsCount: mission.measurementsCount,
        recordingFrequency: mission.recordingFrequency,
        deviceName: mission.deviceName,
        shared: mission.shared,
        synced: mission.synced,
      };

      // Save metadata to localStorage
      const metadataKey = `mission_meta_${mission.id}`;
      localStorage.setItem(metadataKey, JSON.stringify(metadata));

      // Save measurements to IndexedDB
      if (mission.measurements && mission.measurements.length > 0) {
        await this.saveMeasurementsToIDB(mission.id, mission.measurements);
      }

      // Update mission list in localStorage
      this.updateMissionList(mission.id);

      logger.info(`💾 Mission saved (hybrid): ${mission.name} with ${mission.measurementsCount} measurements`);
    } catch (error) {
      logger.error('Failed to save mission (hybrid)', error);
      throw error;
    }
  }

  /**
   * Save measurements to IndexedDB
   */
  private async saveMeasurementsToIDB(missionId: string, measurements: MeasurementData[]): Promise<void> {
    if (!this.db) throw new Error('IndexedDB not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MEASUREMENTS_STORE], 'readwrite');
      const store = transaction.objectStore(MEASUREMENTS_STORE);

      const data = {
        missionId,
        measurements,
        timestamp: Date.now(),
      };

      const request = store.put(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get mission with measurements from IndexedDB
   */
  async getMission(missionId: string): Promise<MissionData | null> {
    try {
      await this.initDB();

      // Get metadata from localStorage
      const metadataKey = `mission_meta_${missionId}`;
      const metadataStr = localStorage.getItem(metadataKey);
      if (!metadataStr) return null;

      const metadata = JSON.parse(metadataStr);

      // Get measurements from IndexedDB
      const measurements = await this.getMeasurementsFromIDB(missionId);

      return {
        ...metadata,
        measurements: measurements || [],
      } as MissionData;
    } catch (error) {
      logger.error(`Failed to get mission ${missionId}`, error);
      return null;
    }
  }

  /**
   * Get measurements from IndexedDB
   */
  private async getMeasurementsFromIDB(missionId: string): Promise<MeasurementData[] | null> {
    if (!this.db) throw new Error('IndexedDB not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MEASUREMENTS_STORE], 'readonly');
      const store = transaction.objectStore(MEASUREMENTS_STORE);
      const request = store.get(missionId);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.measurements : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all missions
   */
  async getAllMissions(): Promise<MissionData[]> {
    try {
      await this.initDB();

      const missionIds = this.getMissionList();
      const missions: MissionData[] = [];

      for (const id of missionIds) {
        const mission = await this.getMission(id);
        if (mission) {
          missions.push(mission);
        }
      }

      return missions.sort((a, b) => 
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      );
    } catch (error) {
      logger.error('Failed to get all missions', error);
      return [];
    }
  }

  /**
   * Delete mission from hybrid storage
   */
  async deleteMission(missionId: string): Promise<void> {
    try {
      await this.initDB();

      // Delete from localStorage
      localStorage.removeItem(`mission_meta_${missionId}`);

      // Delete from IndexedDB
      if (this.db) {
        await new Promise<void>((resolve, reject) => {
          const transaction = this.db!.transaction([MEASUREMENTS_STORE], 'readwrite');
          const store = transaction.objectStore(MEASUREMENTS_STORE);
          const request = store.delete(missionId);

          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }

      // Update mission list
      this.removeMissionFromList(missionId);

      logger.info(`🗑️ Mission deleted (hybrid): ${missionId}`);
    } catch (error) {
      logger.error('Failed to delete mission', error);
      throw error;
    }
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats(): Promise<{
    localStorage: number;
    indexedDB: number;
    total: number;
    quota: number;
    percentUsed: number;
  }> {
    // Calculate localStorage usage
    let localStorageSize = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        localStorageSize += localStorage[key].length + key.length;
      }
    }

    // Get overall storage estimate
    let quota = 0;
    let usage = 0;
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      quota = estimate.quota || 0;
      usage = estimate.usage || 0;
    }

    const indexedDBSize = usage - localStorageSize;

    return {
      localStorage: localStorageSize,
      indexedDB: Math.max(0, indexedDBSize),
      total: usage,
      quota,
      percentUsed: quota > 0 ? (usage / quota) * 100 : 0,
    };
  }

  /**
   * Update mission list in localStorage
   */
  private updateMissionList(missionId: string): void {
    const list = this.getMissionList();
    if (!list.includes(missionId)) {
      list.push(missionId);
      localStorage.setItem('hybrid_mission_list', JSON.stringify(list));
    }
  }

  /**
   * Get mission list from localStorage
   */
  private getMissionList(): string[] {
    const listStr = localStorage.getItem('hybrid_mission_list');
    return listStr ? JSON.parse(listStr) : [];
  }

  /**
   * Remove mission from list
   */
  private removeMissionFromList(missionId: string): void {
    const list = this.getMissionList();
    const filtered = list.filter(id => id !== missionId);
    localStorage.setItem('hybrid_mission_list', JSON.stringify(filtered));
  }

  /**
   * Clear all data
   */
  async clearAll(): Promise<void> {
    try {
      await this.initDB();

      // Clear localStorage mission data
      const missionIds = this.getMissionList();
      for (const id of missionIds) {
        localStorage.removeItem(`mission_meta_${id}`);
      }
      localStorage.removeItem('hybrid_mission_list');

      // Clear IndexedDB
      if (this.db) {
        await new Promise<void>((resolve, reject) => {
          const transaction = this.db!.transaction([MEASUREMENTS_STORE, MISSIONS_STORE], 'readwrite');
          
          const clearMeasurements = transaction.objectStore(MEASUREMENTS_STORE).clear();
          const clearMissions = transaction.objectStore(MISSIONS_STORE).clear();

          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
        });
      }

      logger.info('🧹 All hybrid storage cleared');
    } catch (error) {
      logger.error('Failed to clear hybrid storage', error);
      throw error;
    }
  }
}

// Export singleton instance
export const hybridStorage = new HybridStorageService();
