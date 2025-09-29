import { supabase } from '@/integrations/supabase/client';
import { PMScanData } from '@/lib/pmscan/types';
import { LocationData } from '@/types/PMScan';
import { exportMissionToCSV } from './csvExport';
import {
  createMissionFromRecording,
  saveMissionLocally,
  deleteMission,
} from './missionManager';
import {
  getLocalMissions,
  formatDatabaseMission,
  clearLocalStorage,
} from './localStorage';
import { syncPendingMissions } from './dataSync';
import * as logger from '@/utils/logger';

// Debounced sync to prevent excessive syncing
let syncTimeout: NodeJS.Timeout | null = null;
const SYNC_DEBOUNCE_MS = 5000; // 5 seconds

export interface MissionData {
  id: string;
  name: string;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  avgPm1: number;
  avgPm25: number;
  avgPm10: number;
  maxPm25: number;
  measurementsCount: number;
  locationContext?: string;
  activityContext?: string;
  recordingFrequency: string;
  shared: boolean;
  deviceName?: string;
  measurements: MeasurementData[];
  synced: boolean; // For local storage tracking
  weatherDataId?: string; // Weather data for the entire mission
  airQualityDataId?: string; // Air quality data for the entire mission
}

export interface MeasurementData {
  id: string;
  timestamp: Date;
  pm1: number;
  pm25: number;
  pm10: number;
  temperature?: number;
  humidity?: number;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  locationContext?: string;
  activityContext?: string;
  automaticContext?: string;
  enrichedLocation?: string;
  geohash?: string; // NEW: Geohash for spatial indexing and privacy
  // weatherDataId removed - now at mission level
}

class DataStorageService {
  // Get all missions (local + synced from database)
  async getAllMissions(): Promise<MissionData[]> {
    const localMissions = getLocalMissions();

    try {
      // Try to fetch from database if online
      const { data: dbMissions, error } = await supabase
        .from('missions')
        .select(
          `
          *,
          measurements (
            id,
            timestamp,
            pm1,
            pm25,
            pm10,
            temperature,
            humidity,
            latitude,
            longitude,
            accuracy,
            location_context,
            activity_context,
            automatic_context,
            enriched_location,
            geohash
          )
        `
        )
        .order('created_at', { ascending: false });

      if (!error && dbMissions) {
        const formattedDbMissions = dbMissions.map(formatDatabaseMission);

        // Filter out database missions that have no measurements (orphaned missions)
        const validDbMissions = formattedDbMissions.filter(mission => {
          const hasValidMeasurements = mission.measurements && mission.measurements.length > 0;
          if (!hasValidMeasurements && mission.measurementsCount > 0) {
            logger.warn(`⚠️ Mission ${mission.name} has ${mission.measurementsCount} measurements in metadata but 0 actual measurements - likely orphaned`);
          }
          return hasValidMeasurements;
        });

        // Merge with local unsynced missions
        const unsyncedLocal = localMissions.filter((m) => !m.synced);
        return [...unsyncedLocal, ...validDbMissions];
      }
    } catch (error) {
      logger.debug('Database not available, using local data only:', error);
    }

    return localMissions;
  }

  // Export methods
  exportMissionToCSV = exportMissionToCSV;
  clearLocalStorage = clearLocalStorage;

  // Mission management methods
  createMissionFromRecording = createMissionFromRecording;
  saveMissionLocally = saveMissionLocally;
  deleteMission = deleteMission;

  // Sync methods with proper debouncing
  async syncPendingMissions(): Promise<void> {
    // Clear existing timeout
    if (syncTimeout) {
      clearTimeout(syncTimeout);
    }

    // Don't sync if already syncing
    if (this.isSyncing) {
      logger.debug('🔄 Sync already in progress, skipping...');
      return;
    }

    // Set new timeout for debounced sync
    return new Promise((resolve) => {
      syncTimeout = setTimeout(async () => {
        try {
          this.isSyncing = true;
          await syncPendingMissions();
          logger.debug('✅ Sync completed');
        } catch (error) {
          logger.error('❌ Sync failed:', error);
        } finally {
          this.isSyncing = false;
          resolve();
        }
      }, SYNC_DEBOUNCE_MS);
    });
  }

  private isSyncing = false;
}

export const dataStorage = new DataStorageService();
