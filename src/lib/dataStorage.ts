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
        const allMissions = [...unsyncedLocal, ...validDbMissions];
        
        // Silently reload full measurements for missions with incomplete data
        const enrichedMissions = await Promise.all(
          allMissions.map(async (mission) => {
            // Check if measurements are incomplete (stripped for storage optimization)
            const isIncomplete = mission.measurements.length < mission.measurementsCount;
            
            if (isIncomplete && navigator.onLine && mission.synced) {
              logger.debug(`🔄 Reloading full measurements for mission ${mission.name} (${mission.measurements.length}/${mission.measurementsCount})`);
              
              try {
                // Reload only measurements from database
                const { data: fullMeasurements, error } = await supabase
                  .from('measurements')
                  .select('*')
                  .eq('mission_id', mission.id)
                  .order('timestamp', { ascending: true });
                
                if (!error && fullMeasurements && fullMeasurements.length > 0) {
                  mission.measurements = fullMeasurements.map(m => ({
                    id: m.id,
                    timestamp: new Date(m.timestamp),
                    pm1: m.pm1,
                    pm25: m.pm25,
                    pm10: m.pm10,
                    temperature: m.temperature ?? undefined,
                    humidity: m.humidity ?? undefined,
                    latitude: m.latitude ?? undefined,
                    longitude: m.longitude ?? undefined,
                    accuracy: m.accuracy ?? undefined,
                    locationContext: m.location_context ?? undefined,
                    activityContext: m.activity_context ?? undefined,
                    automaticContext: m.automatic_context ?? undefined,
                    enrichedLocation: m.enriched_location ?? undefined,
                    geohash: m.geohash ?? undefined,
                  }));
                  
                  logger.debug(`✅ Reloaded ${fullMeasurements.length} measurements for ${mission.name}`);
                }
              } catch (error) {
                logger.debug('Failed to reload measurements, using compressed data:', error);
              }
            }
            
            return mission;
          })
        );
        
        return enrichedMissions;
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
  
  // Storage optimization - delegate to missionManager
  stripMeasurementsFromStorage = stripMeasurementsFromStorage;

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
