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

    // Get the latest PMScan data directly
    const currentData = this.getCurrentPMScanData();
    if (currentData) {
      this.lastRecordTime = now;
      
      // Add data point directly instead of using callback
      this.addDataPoint(currentData);
      
      console.log('📊 Native recording collected data point at', new Date().toLocaleTimeString(), 'PM2.5:', currentData.pm25);
    } else {
      console.log('⚠️ No PMScan data available for collection at', new Date().toLocaleTimeString());
    }
  }

  private getCurrentPMScanData(): PMScanData | null {
    // Access the global PMScan data that's updated by the Bluetooth connection
    try {
      const globalData = (window as any).currentPMScanData;
      
      return globalData || null;
    } catch (error) {
      console.log('❌ Error accessing global PMScan data:', error);
      return null;
    }
  }

  addDataPoint(pmData: PMScanData, location?: LocationData): void {
    if (!this.isRecording) return;

    // Create a clean, serializable entry without Date objects or functions
    const cleanEntry: RecordingEntry = {
      pmData: {
        pm1: pmData.pm1,
        pm25: pmData.pm25,
        pm10: pmData.pm10,
        temp: pmData.temp,
        humidity: pmData.humidity,
        battery: pmData.battery,
        charging: pmData.charging,
        timestamp: new Date(), // Fresh timestamp for recording
      },
      location: location ? {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy || 0,
        timestamp: location.timestamp || new Date(),
      } : undefined,
      context: {
        location: this.missionContext.location,
        activity: this.missionContext.activity,
      },
      timestamp: new Date(),
    };

    this.recordingData.push(cleanEntry);
    
    // Create a serializable payload for the event
    const eventPayload = {
      pm25: pmData.pm25,
      pm1: pmData.pm1,
      pm10: pmData.pm10,
      totalCount: this.recordingData.length,
      timestamp: Date.now(), // Use timestamp instead of Date object
    };
    
    // Trigger React context update with serializable data
    window.dispatchEvent(new CustomEvent('nativeDataAdded', { 
      detail: eventPayload
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
    // Only log occasionally to prevent spam
    if (Math.random() < 0.1) { // 10% chance to log
      console.log('🔍 Native service state: recording:', this.isRecording, 'data length:', this.recordingData.length);
    }
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

// Make PMScan data globally available with clean serializable data
export function updateGlobalPMScanData(data: PMScanData): void {
  // Store a clean, serializable version
  (window as any).currentPMScanData = {
    pm1: data.pm1,
    pm25: data.pm25,
    pm10: data.pm10,
    temp: data.temp,
    humidity: data.humidity,
    battery: data.battery,
    charging: data.charging,
    timestamp: new Date(data.timestamp), // Ensure it's a proper Date object
  };
}