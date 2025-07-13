import { supabase } from "@/integrations/supabase/client";
import { PMScanData } from "@/lib/pmscan/types";
import { LocationData } from "@/types/PMScan";
import { exportMissionToCSV } from "./csvExport";
import { createMissionFromRecording, saveMissionLocally, deleteMission } from "./missionManager";
import { getLocalMissions, formatDatabaseMission, clearLocalStorage } from "./localStorage";
import { syncPendingMissions } from "./dataSync";

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
        .select(`
          *,
          measurements (*)
        `)
        .order('created_at', { ascending: false });

      if (!error && dbMissions) {
        const formattedDbMissions = dbMissions.map(formatDatabaseMission);
        
        // Merge with local unsynced missions
        const unsyncedLocal = localMissions.filter(m => !m.synced);
        return [...unsyncedLocal, ...formattedDbMissions];
      }
    } catch (error) {
      console.log('Database not available, using local data only:', error);
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

  // Sync methods
  syncPendingMissions = syncPendingMissions;
}

export const dataStorage = new DataStorageService();
