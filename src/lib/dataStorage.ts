import { supabase } from '@/integrations/supabase/client';
import { PMScanData } from '@/lib/pmscan/types';
import { LocationData } from '@/types/PMScan';
import { exportMissionToCSV } from './csvExport';
import {
  createMissionFromRecording,
  saveMissionLocally,
  deleteMission,
  stripMeasurementsFromStorage,
} from './missionManager';
import {
  getLocalMissions,
  formatDatabaseMission,
  clearLocalStorage,
} from './localStorage';
import { syncPendingMissions } from './dataSync';
import { migrateMeasurementsContext } from '@/utils/contextMigration';
import * as logger from '@/utils/logger';

// Debounced sync to prevent excessive syncing
let syncTimeout: NodeJS.Timeout | null = null;
const SYNC_DEBOUNCE_MS = 5000; // 5 seconds

export interface MissionData {
  id: string;
  userId?: string; // User who created this mission
  name: string;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  actualRecordingMinutes?: number; // Actual time spent recording (accounting for gaps)
  recordingCoveragePercentage?: number; // Percentage of expected recording time covered
  gapDetected?: boolean; // Whether significant gaps were detected in the recording
  avgPm1: number;
  avgPm25: number;
  avgPm10: number;
  maxPm25: number;
  measurementsCount: number;
  recordingFrequency: string;
  shared: boolean;
  groupId?: string;
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
  async getAllMissions(limit = 50, offset = 0): Promise<MissionData[]> {
    const localMissions = getLocalMissions();

    try {
      // Try to fetch from database if online
      // ✅ Fetch missions WITHOUT measurements to reduce data transfer
      const { data: dbMissions, error } = await supabase
        .from('missions')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (!error && dbMissions) {
        // ✅ Format missions with empty measurements array for now (lazy loading)
        const formattedDbMissions = dbMissions.map(dbMission => ({
          ...formatDatabaseMission({ ...dbMission, measurements: [] }),
          measurements: [], // Start with empty measurements - will be loaded on demand
        }));

        const validDbMissions: MissionData[] = formattedDbMissions;

        // Merge with local unsynced missions
        const unsyncedLocal = localMissions.filter((m) => !m.synced);
        const allMissions = [...unsyncedLocal, ...validDbMissions];
        
        // ✅ REMOVED: Measurements are now lazy-loaded on demand, not pre-fetched
        // This dramatically improves initial load performance
        
        return allMissions;
      }
    } catch (error) {
      logger.debug('Database not available, using local data only:', error);
    }

    return localMissions;
  }

  // Bulk load measurements for multiple missions (for analysis)
  async getMeasurementsForMissions(missionIds: string[]): Promise<Record<string, MeasurementData[]>> {
    if (missionIds.length === 0) return {};

    try {
      const { data, error } = await supabase
        .from('measurements')
        .select('id, mission_id, timestamp, pm1, pm25, pm10, location_context, activity_context, automatic_context, latitude, longitude, accuracy, temperature, humidity, enriched_location, geohash')
        .in('mission_id', missionIds)
        .order('timestamp', { ascending: true });

      if (error) {
        logger.error('Error fetching measurements for missions:', error);
        return {};
      }

      if (!data) return {};

      // Group measurements by mission_id
      const measurementsByMission: Record<string, MeasurementData[]> = {};
      
      for (const row of data) {
        const measurement: MeasurementData = {
          id: row.id,
          timestamp: new Date(row.timestamp),
          pm1: row.pm1 ?? 0,
          pm25: row.pm25 ?? 0,
          pm10: row.pm10 ?? 0,
          temperature: row.temperature ?? undefined,
          humidity: row.humidity ?? undefined,
          latitude: row.latitude ?? undefined,
          longitude: row.longitude ?? undefined,
          accuracy: row.accuracy ?? undefined,
          locationContext: row.location_context ?? undefined,
          activityContext: row.activity_context ?? undefined,
          automaticContext: row.automatic_context ?? undefined,
          enrichedLocation: row.enriched_location ?? undefined,
          geohash: row.geohash ?? undefined,
        };

        if (!measurementsByMission[row.mission_id]) {
          measurementsByMission[row.mission_id] = [];
        }
        measurementsByMission[row.mission_id].push(measurement);
      }

      logger.debug(`Bulk loaded measurements for ${Object.keys(measurementsByMission).length} missions`);
      return measurementsByMission;
    } catch (error) {
      logger.error('Exception fetching measurements:', error);
      return {};
    }
  }

  // Export methods
  exportMissionToCSV = exportMissionToCSV;
  clearLocalStorage = clearLocalStorage;

  // Mission management methods
  createMissionFromRecording = createMissionFromRecording;
  saveMissionLocally = saveMissionLocally;
  deleteMission = deleteMission;
  
  // Storage optimization - delegate to missionManager
  stripMeasurementsFromStorage = stripMeasurementsFromStorage;

  // Get measurements for a specific mission (lazy loading)
  async getMissionMeasurements(missionId: string): Promise<MeasurementData[]> {
    // 1. Check local storage first
    const localMissions = getLocalMissions();
    const localMission = localMissions.find(m => m.id === missionId);
    
    if (localMission && localMission.measurements.length > 0) {
      return localMission.measurements;
    }
    
    // 2. Fetch from database if not in local storage
    try {
      const { data, error } = await supabase
        .from('measurements')
        .select('*')
        .eq('mission_id', missionId)
        .order('timestamp', { ascending: true });
      
      if (error) throw error;
      
      return (data || []).map(m => ({
        id: m.id,
        timestamp: new Date(m.timestamp),
        pm1: m.pm1,
        pm25: m.pm25,
        pm10: m.pm10,
        temperature: m.temperature,
        humidity: m.humidity,
        latitude: m.latitude,
        longitude: m.longitude,
        accuracy: m.accuracy,
        locationContext: m.location_context,
        activityContext: m.activity_context,
        automaticContext: m.automatic_context,
        enrichedLocation: m.enriched_location,
        geohash: m.geohash,
      }));
    } catch (error) {
      logger.error('Failed to load mission measurements:', error);
      return [];
    }
  }

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
