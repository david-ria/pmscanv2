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
  measurements: MeasurementData[];
  synced: boolean; // For local storage tracking
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
          measurements (*)
        `
        )
        .order('created_at', { ascending: false });

      if (!error && dbMissions) {
        const formattedDbMissions = dbMissions.map(formatDatabaseMission);

        // Merge with local unsynced missions
        const unsyncedLocal = localMissions.filter((m) => !m.synced);
        return [...unsyncedLocal, ...formattedDbMissions];
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

  // Sync methods with debouncing
  async syncPendingMissions(): Promise<void> {
    // Clear existing timeout
    if (syncTimeout) {
      clearTimeout(syncTimeout);
    }
    
    // Set new timeout
    return new Promise((resolve, reject) => {
      syncTimeout = setTimeout(async () => {
        try {
          await syncPendingMissions();
          resolve();
        } catch (error) {
          reject(error);
        }
      }, SYNC_DEBOUNCE_MS);
    });
  }
}

export const dataStorage = new DataStorageService();
