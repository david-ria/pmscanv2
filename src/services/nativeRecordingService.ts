import { PMScanData } from '@/lib/pmscan/types';
import { LocationData } from '@/types/PMScan';
import { RecordingEntry, MissionContext } from '@/types/recording';
import { parseFrequencyToMs } from '@/lib/recordingUtils';
import * as logger from '@/utils/logger';

// Pure JavaScript recording service - immune to React lifecycle
class NativeRecordingService {
  private static instance: NativeRecordingService;
  private isRecording = false;
  private recordingData: RecordingEntry[] = [];
  private recordingFrequency = '10s';
  private lastRecordTime = 0;
  private missionContext: MissionContext = { location: '', activity: '' };
  private currentMissionId: string | null = null;
  private recordingStartTime: Date | null = null;
  
  // Native JavaScript interval - not affected by React lifecycle
  private recordingInterval: number | null = null;
  private dataCollectionCallback: ((data: PMScanData, location?: LocationData) => void) | null = null;

  static getInstance(): NativeRecordingService {
    if (!NativeRecordingService.instance) {
      NativeRecordingService.instance = new NativeRecordingService();
    }
    return NativeRecordingService.instance;
  }

  startRecording(frequency: string = '10s'): void {
    console.log('🎬 Native recording starting with frequency:', frequency);
    
    this.isRecording = true;
    this.recordingFrequency = frequency;
    this.recordingStartTime = new Date();
    this.currentMissionId = crypto.randomUUID();
    this.recordingData = [];
    this.lastRecordTime = 0;

    // Start native JavaScript interval
    const intervalMs = parseFrequencyToMs(frequency);
    this.recordingInterval = window.setInterval(() => {
      this.collectDataPoint();
    }, intervalMs);

    console.log('✅ Native recording started - interval set for', intervalMs, 'ms');
  }

  stopRecording(): void {
    console.log('🛑 Native recording stopping...');
    
    this.isRecording = false;
    
    if (this.recordingInterval) {
      window.clearInterval(this.recordingInterval);
      this.recordingInterval = null;
    }

    console.log('✅ Native recording stopped');
  }

  private collectDataPoint(): void {
    if (!this.isRecording) return;

    const now = Date.now();
    const frequencyMs = parseFrequencyToMs(this.recordingFrequency);
    
    // Only record if enough time has passed
    if (now - this.lastRecordTime < frequencyMs - 100) return; // 100ms tolerance

    // Request current data from PMScan
    if (this.dataCollectionCallback) {
      // Get the latest PMScan data
      const currentData = this.getCurrentPMScanData();
      if (currentData) {
        this.lastRecordTime = now;
        this.dataCollectionCallback(currentData);
        
        console.log('📊 Native recording collected data point at', new Date().toLocaleTimeString());
      }
    }
  }

  private getCurrentPMScanData(): PMScanData | null {
    // Access the global PMScan data that's updated by the Bluetooth connection
    // This should be available regardless of React component state
    try {
      const globalData = (window as any).currentPMScanData;
      return globalData || null;
    } catch (error) {
      return null;
    }
  }

  addDataPoint(pmData: PMScanData, location?: LocationData): void {
    if (!this.isRecording) return;

    const entry: RecordingEntry = {
      pmData: { ...pmData, timestamp: new Date() },
      location,
      context: this.missionContext,
      timestamp: new Date(),
    };

    this.recordingData.push(entry);
    
    // Trigger React context update by dispatching custom event
    window.dispatchEvent(new CustomEvent('nativeDataAdded', { 
      detail: { entry, totalCount: this.recordingData.length } 
    }));
    
    console.log('📊 Native data point added. Total:', this.recordingData.length);
  }

  updateMissionContext(location: string, activity: string): void {
    this.missionContext = { location, activity };
  }

  getRecordingData(): RecordingEntry[] {
    return [...this.recordingData];
  }

  getState() {
    console.log('🔍 Native service getState() called, recordingData length:', this.recordingData.length);
    return {
      isRecording: this.isRecording,
      recordingData: this.recordingData,
      recordingFrequency: this.recordingFrequency,
      missionContext: this.missionContext,
      currentMissionId: this.currentMissionId,
      recordingStartTime: this.recordingStartTime,
    };
  }

  clearRecordingData(): void {
    this.recordingData = [];
    this.recordingStartTime = null;
    this.currentMissionId = null;
  }

  // Set callback for data collection
  setDataCollectionCallback(callback: (data: PMScanData, location?: LocationData) => void): void {
    this.dataCollectionCallback = callback;
  }
}

export const nativeRecordingService = NativeRecordingService.getInstance();

// Make PMScan data globally available
export function updateGlobalPMScanData(data: PMScanData): void {
  (window as any).currentPMScanData = data;
}