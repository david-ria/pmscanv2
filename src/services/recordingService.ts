import { PMScanData } from '@/lib/pmscan/types';
import { LocationData } from '@/types/PMScan';
import { RecordingEntry, MissionContext } from '@/types/recording';
import { setGlobalRecording, getBackgroundRecording } from '@/lib/pmscan/globalConnectionManager';
import { parseFrequencyToMs, shouldRecordData } from '@/lib/recordingUtils';
import * as logger from '@/utils/logger';

export interface RecordingState {
  recordingData: RecordingEntry[];
  isRecording: boolean;
  recordingFrequency: string;
  missionContext: MissionContext;
  recordingStartTime: Date | null;
  currentMissionId: string | null;
}

export interface RecordingActions {
  startRecording: (frequency?: string) => void;
  stopRecording: () => void;
  addDataPoint: (
    pmData: PMScanData,
    location?: LocationData,
    context?: MissionContext,
    automaticContext?: string
  ) => void;
  updateMissionContext: (location: string, activity: string) => void;
  clearRecordingData: () => void;
  saveMission: (
    name: string,
    locationContext?: string,
    activityContext?: string,
    recordingFrequency?: string,
    shared?: boolean
  ) => any;
}

class RecordingService {
  private static instance: RecordingService;
  private listeners: Set<(state: RecordingState) => void> = new Set();
  private lastRecordedTime: Date | null = null;
  private backgroundRecordingEnabled: boolean = false;
  private backgroundDataHandler: ((pmData: PMScanData, location?: LocationData, context?: any) => void) | null = null;
  
  private state: RecordingState = {
    recordingData: [],
    isRecording: false,
    recordingFrequency: '10s',
    missionContext: { location: '', activity: '' },
    recordingStartTime: null,
    currentMissionId: null,
  };

  static getInstance(): RecordingService {
    if (!RecordingService.instance) {
      RecordingService.instance = new RecordingService();
    }
    return RecordingService.instance;
  }

  subscribe(listener: (state: RecordingState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(listener => listener({ ...this.state }));
  }

  getState(): RecordingState {
    return { ...this.state };
  }

  startRecording(frequency: string = '10s'): void {
    logger.debug('🎬 Starting recording with frequency:', frequency);
    
    // Generate a new mission ID when recording starts
    const newMissionId = crypto.randomUUID();
    
    this.state = {
      ...this.state,
      isRecording: true,
      recordingFrequency: frequency,
      recordingStartTime: new Date(),
      recordingData: [], // Clear previous data
      currentMissionId: newMissionId,
    };

    setGlobalRecording(true);
    this.notify();
    
    logger.debug('✅ Recording started! isRecording should now be:', true);
  }

  stopRecording(): void {
    logger.debug('🛑 Stopping recording...');
    
    this.state = {
      ...this.state,
      isRecording: false,
      // Keep recordingStartTime and currentMissionId for mission saving - will be cleared when data is cleared
    };

    setGlobalRecording(false);
    this.notify();
    
    logger.debug('✅ Recording stopped successfully');
  }

  addDataPoint(
    pmData: PMScanData,
    location?: LocationData,
    context?: MissionContext,
    automaticContext?: string
  ): void {
    if (!this.state.isRecording) {
      logger.debug('⚠️ Attempted to add data point while not recording');
      return;
    }

    // Check if enough time has passed based on recording frequency
    const frequencyMs = parseFrequencyToMs(this.state.recordingFrequency);
    
    if (!shouldRecordData(this.lastRecordedTime, frequencyMs)) {
      return;
    }

    // Update last recorded time
    const currentTime = new Date();
    this.lastRecordedTime = currentTime;

    // Use the current recorded time as the definitive timestamp
    const pmDataWithTimestamp = {
      ...pmData,
      timestamp: currentTime,
    };

    const entry: RecordingEntry = {
      pmData: pmDataWithTimestamp,
      location,
      context: context || this.state.missionContext,
      automaticContext,
      timestamp: currentTime,
    };

    // Store data for background processing if background mode is enabled
    if (getBackgroundRecording() && this.backgroundDataHandler) {
      this.backgroundDataHandler(pmDataWithTimestamp, location, context);
    }

    this.state = {
      ...this.state,
      recordingData: [...this.state.recordingData, entry],
    };

    this.notify();
    
    logger.debug('📊 Data point added. Total entries:', this.state.recordingData.length);
  }

  updateMissionContext(location: string, activity: string): void {
    this.state = {
      ...this.state,
      missionContext: { location, activity },
    };

    this.notify();
    
    logger.debug('🏷️ Mission context updated:', { location, activity });
  }

  clearRecordingData(): void {
    this.state = {
      ...this.state,
      recordingData: [],
      recordingStartTime: null, // Clear start time when data is cleared
      currentMissionId: null, // Clear mission ID when data is cleared
    };

    this.notify();
    
    logger.debug('🧹 Recording data cleared');
  }

  saveMission(
    name: string,
    locationContext?: string,
    activityContext?: string,
    recordingFrequency?: string,
    shared?: boolean
  ): any {
    // For now, just return a simple mission object
    // This should integrate with the actual mission saving logic
    const mission = {
      id: this.state.currentMissionId || crypto.randomUUID(),
      name,
      data: this.state.recordingData,
      startTime: this.state.recordingStartTime,
      locationContext,
      activityContext,
      frequency: recordingFrequency || this.state.recordingFrequency,
      shared: shared || false,
    };
    
    logger.debug('💾 Mission saved:', mission.id);
    
    // Clear recording data after saving
    this.clearRecordingData();
    
    return mission;
  }

  // Utility methods
  getRecordingDuration(): number {
    if (!this.state.recordingStartTime) return 0;
    return Date.now() - this.state.recordingStartTime.getTime();
  }

  getDataPointCount(): number {
    return this.state.recordingData.length;
  }

  getLatestDataPoint(): RecordingEntry | null {
    const data = this.state.recordingData;
    return data.length > 0 ? data[data.length - 1] : null;
  }

  getAverageValues(): { pm1: number; pm25: number; pm10: number } | null {
    if (this.state.recordingData.length === 0) return null;

    const totals = this.state.recordingData.reduce(
      (acc, entry) => ({
        pm1: acc.pm1 + entry.pmData.pm1,
        pm25: acc.pm25 + entry.pmData.pm25,
        pm10: acc.pm10 + entry.pmData.pm10,
      }),
      { pm1: 0, pm25: 0, pm10: 0 }
    );

    const count = this.state.recordingData.length;
    return {
      pm1: totals.pm1 / count,
      pm25: totals.pm25 / count,
      pm10: totals.pm10 / count,
    };
  }

  exportData(): RecordingEntry[] {
    return [...this.state.recordingData];
  }

  // Background recording integration
  setBackgroundDataHandler(handler: ((pmData: PMScanData, location?: LocationData, context?: any) => void) | null): void {
    this.backgroundDataHandler = handler;
    logger.debug('🌙 Background data handler set:', !!handler);
  }

  enableBackgroundRecording(): void {
    this.backgroundRecordingEnabled = true;
    logger.debug('🌙 Background recording enabled in service');
  }

  disableBackgroundRecording(): void {
    this.backgroundRecordingEnabled = false;
    this.backgroundDataHandler = null;
    logger.debug('🌙 Background recording disabled in service');
  }

  isBackgroundRecordingEnabled(): boolean {
    return this.backgroundRecordingEnabled;
  }
}

// Export singleton instance
export const recordingService = RecordingService.getInstance();