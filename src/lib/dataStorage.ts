import { supabase } from "@/integrations/supabase/client";
import { PMScanData } from "@/lib/pmscan/types";
import { LocationData } from "@/types/PMScan";

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
  deviceId?: string;
  deviceName?: string;
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
}

class DataStorageService {
  private readonly MISSIONS_KEY = 'pmscan_missions';
  private readonly PENDING_SYNC_KEY = 'pmscan_pending_sync';

  // Get all missions (local + synced from database)
  async getAllMissions(): Promise<MissionData[]> {
    const localMissions = this.getLocalMissions();
    
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
        const formattedDbMissions = dbMissions.map(this.formatDatabaseMission);
        
        // Merge with local unsynced missions
        const unsyncedLocal = localMissions.filter(m => !m.synced);
        return [...unsyncedLocal, ...formattedDbMissions];
      }
    } catch (error) {
      console.log('Database not available, using local data only:', error);
    }

    return localMissions;
  }

  // Save mission locally
  saveMissionLocally(mission: MissionData): void {
    try {
      const missions = this.getLocalMissions();
      const existingIndex = missions.findIndex(m => m.id === mission.id);
      
      if (existingIndex >= 0) {
        missions[existingIndex] = mission;
      } else {
        missions.push(mission);
      }
      
      // Try to save, if quota exceeded, clean up old data
      try {
        localStorage.setItem(this.MISSIONS_KEY, JSON.stringify(missions));
      } catch (quotaError) {
        if (quotaError instanceof DOMException && quotaError.name === 'QuotaExceededError') {
          console.warn('LocalStorage quota exceeded, cleaning up old missions...');
          this.cleanupOldMissions(missions);
          // Try again after cleanup
          localStorage.setItem(this.MISSIONS_KEY, JSON.stringify(missions));
        } else {
          throw quotaError;
        }
      }
      
      // Add to pending sync if not already synced
      if (!mission.synced) {
        this.addToPendingSync(mission.id);
      }
    } catch (error) {
      console.error('Failed to save mission locally:', error);
      throw new Error("Impossible de sauvegarder la mission localement. Mémoire insuffisante.");
    }
  }

  // Sync local missions to database
  async syncPendingMissions(): Promise<void> {
    if (!navigator.onLine) return;

    const pendingIds = this.getPendingSyncIds();
    const localMissions = this.getLocalMissions();
    
    for (const missionId of pendingIds) {
      const mission = localMissions.find(m => m.id === missionId);
      if (!mission) continue;

      try {
        // Save mission to database
        const { data: savedMission, error: missionError } = await supabase
          .from('missions')
          .insert({
            id: mission.id,
            name: mission.name,
            start_time: mission.startTime.toISOString(),
            end_time: mission.endTime.toISOString(),
            duration_minutes: mission.durationMinutes,
            avg_pm1: mission.avgPm1,
            avg_pm25: mission.avgPm25,
            avg_pm10: mission.avgPm10,
            max_pm25: mission.maxPm25,
            measurements_count: mission.measurementsCount,
            location_context: mission.locationContext,
            activity_context: mission.activityContext,
            recording_frequency: mission.recordingFrequency,
            shared: mission.shared
          })
          .select()
          .single();

        if (missionError) throw missionError;

        // Save measurements to database
        const measurementsToInsert = mission.measurements.map(m => ({
          id: m.id,
          mission_id: mission.id,
          timestamp: m.timestamp.toISOString(),
          pm1: m.pm1,
          pm25: m.pm25,
          pm10: m.pm10,
          temperature: m.temperature,
          humidity: m.humidity,
          latitude: m.latitude,
          longitude: m.longitude,
          accuracy: m.accuracy
        }));

        const { error: measurementsError } = await supabase
          .from('measurements')
          .insert(measurementsToInsert);

        if (measurementsError) throw measurementsError;

        // Mark as synced locally
        mission.synced = true;
        this.saveMissionLocally(mission);
        this.removeFromPendingSync(mission.id);

        console.log(`Mission ${mission.name} synced successfully`);
      } catch (error) {
        console.error(`Failed to sync mission ${mission.name}:`, error);
      }
    }
  }

  // Create mission from recording data
  createMissionFromRecording(
    measurements: Array<{
      pmData: PMScanData;
      location?: LocationData;
    }>,
    missionName: string,
    startTime: Date,
    endTime: Date,
    locationContext?: string,
    activityContext?: string,
    recordingFrequency?: string,
    shared?: boolean,
    deviceId?: string,
    deviceName?: string
  ): MissionData {
    const measurementData: MeasurementData[] = measurements.map(m => ({
      id: crypto.randomUUID(),
      timestamp: m.pmData.timestamp,
      pm1: m.pmData.pm1,
      pm25: m.pmData.pm25,
      pm10: m.pmData.pm10,
      temperature: m.pmData.temp,
      humidity: m.pmData.humidity,
      latitude: m.location?.latitude,
      longitude: m.location?.longitude,
      accuracy: m.location?.accuracy
    }));

    const pm25Values = measurementData.map(m => m.pm25);
    const avgPm1 = measurementData.reduce((sum, m) => sum + m.pm1, 0) / measurementData.length;
    const avgPm25 = measurementData.reduce((sum, m) => sum + m.pm25, 0) / measurementData.length;
    const avgPm10 = measurementData.reduce((sum, m) => sum + m.pm10, 0) / measurementData.length;
    const maxPm25 = Math.max(...pm25Values);

    const mission: MissionData = {
      id: crypto.randomUUID(),
      name: missionName,
      startTime,
      endTime,
      durationMinutes: Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60)),
      avgPm1,
      avgPm25,
      avgPm10,
      maxPm25,
      measurementsCount: measurementData.length,
      locationContext,
      activityContext,
      recordingFrequency: recordingFrequency || '30s',
      shared: shared || false,
      measurements: measurementData,
      synced: false,
      deviceId,
      deviceName
    };

    return mission;
  }

  // Export mission to CSV and download
  exportMissionToCSV(mission: MissionData): void {
    const headers = [
      'Timestamp',
      'PM1 (µg/m³)',
      'PM2.5 (µg/m³)', 
      'PM10 (µg/m³)',
      'Temperature (°C)',
      'Humidity (%)',
      'Latitude',
      'Longitude',
      'GPS Accuracy (m)',
      'Device ID',
      'Device Name',
      'Mission Name',
      'Location Context',
      'Activity Context',
      'Recording Frequency'
    ];

    const rows = mission.measurements.map(m => [
      m.timestamp.toISOString(),
      m.pm1.toFixed(1),
      m.pm25.toFixed(1),
      m.pm10.toFixed(1),
      m.temperature?.toFixed(1) || '',
      m.humidity?.toFixed(1) || '',
      m.latitude?.toFixed(6) || '',
      m.longitude?.toFixed(6) || '',
      m.accuracy?.toFixed(0) || '',
      mission.deviceId || '',
      mission.deviceName || '',
      mission.name,
      mission.locationContext || '',
      mission.activityContext || '',
      mission.recordingFrequency
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    // Create and download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const filename = `PMScan_${mission.name}_${mission.startTime.toISOString().split('T')[0]}.csv`;
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log(`Mission exported to CSV: ${filename}`);
  }

  // Clear all local storage after successful export
  clearLocalStorage(): void {
    localStorage.removeItem(this.MISSIONS_KEY);
    localStorage.removeItem(this.PENDING_SYNC_KEY);
    console.log('Local storage cleared after CSV export');
  }

  // Delete mission
  async deleteMission(missionId: string): Promise<void> {
    // Remove from local storage
    const missions = this.getLocalMissions().filter(m => m.id !== missionId);
    localStorage.setItem(this.MISSIONS_KEY, JSON.stringify(missions));
    this.removeFromPendingSync(missionId);

    // Try to delete from database if online
    if (navigator.onLine) {
      try {
        await supabase.from('missions').delete().eq('id', missionId);
      } catch (error) {
        console.error('Failed to delete mission from database:', error);
      }
    }
  }

  // Private helper methods
  private getLocalMissions(): MissionData[] {
    try {
      const stored = localStorage.getItem(this.MISSIONS_KEY);
      if (!stored) return [];
      
      const missions = JSON.parse(stored);
      return missions.map((m: any) => ({
        ...m,
        startTime: new Date(m.startTime),
        endTime: new Date(m.endTime),
        measurements: m.measurements.map((measurement: any) => ({
          ...measurement,
          timestamp: new Date(measurement.timestamp)
        }))
      }));
    } catch (error) {
      console.error('Error reading local missions:', error);
      return [];
    }
  }

  private formatDatabaseMission(dbMission: any): MissionData {
    return {
      id: dbMission.id,
      name: dbMission.name,
      startTime: new Date(dbMission.start_time),
      endTime: new Date(dbMission.end_time),
      durationMinutes: dbMission.duration_minutes,
      avgPm1: dbMission.avg_pm1,
      avgPm25: dbMission.avg_pm25,
      avgPm10: dbMission.avg_pm10,
      maxPm25: dbMission.max_pm25,
      measurementsCount: dbMission.measurements_count,
      locationContext: dbMission.location_context,
      activityContext: dbMission.activity_context,
      recordingFrequency: dbMission.recording_frequency,
      shared: dbMission.shared,
      measurements: dbMission.measurements?.map((m: any) => ({
        id: m.id,
        timestamp: new Date(m.timestamp),
        pm1: m.pm1,
        pm25: m.pm25,
        pm10: m.pm10,
        temperature: m.temperature,
        humidity: m.humidity,
        latitude: m.latitude,
        longitude: m.longitude,
        accuracy: m.accuracy
      })) || [],
      synced: true
    };
  }

  private getPendingSyncIds(): string[] {
    try {
      const stored = localStorage.getItem(this.PENDING_SYNC_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private addToPendingSync(missionId: string): void {
    const pending = this.getPendingSyncIds();
    if (!pending.includes(missionId)) {
      pending.push(missionId);
      localStorage.setItem(this.PENDING_SYNC_KEY, JSON.stringify(pending));
    }
  }

  private removeFromPendingSync(missionId: string): void {
    const pending = this.getPendingSyncIds().filter(id => id !== missionId);
    localStorage.setItem(this.PENDING_SYNC_KEY, JSON.stringify(pending));
  }

  private cleanupOldMissions(missions: MissionData[]): void {
    // Keep only the most recent 10 missions to free up space
    const sortedMissions = missions.sort((a, b) => b.endTime.getTime() - a.endTime.getTime());
    const recentMissions = sortedMissions.slice(0, 10);
    
    console.log(`Cleaning up old missions, keeping ${recentMissions.length} most recent ones`);
    localStorage.setItem(this.MISSIONS_KEY, JSON.stringify(recentMissions));
    
    // Update pending sync list to only include kept missions
    const keptMissionIds = recentMissions.map(m => m.id);
    const updatedPending = this.getPendingSyncIds().filter(id => keptMissionIds.includes(id));
    localStorage.setItem(this.PENDING_SYNC_KEY, JSON.stringify(updatedPending));
  }
}

export const dataStorage = new DataStorageService();