import { PMScanData } from '@/lib/pmscan/types';
import { LocationData } from '@/types/PMScan';
import { RecordingEntry, MissionContext } from '@/types/recording';
import { SerializableRecordingEntry, toSerializablePMScanData, toSerializableLocationData } from '@/types/serializable';
import { parseFrequencyToMs } from '@/lib/recordingUtils';
import * as logger from '@/utils/logger';

// Pure JavaScript recording service - immune to React lifecycle
class NativeRecordingService {
  private static instance: NativeRecordingService;
  private isRecording = false;
  private recordingData: SerializableRecordingEntry[] = [];
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
      
      // Get current location for the recording
      this.getCurrentLocation().then(location => {
        this.addDataPoint(currentData, location);
        console.log('📊 Native recording collected data point at', new Date().toLocaleTimeString(), 'PM2.5:', currentData.pm25, 'Location:', location ? 'Yes' : 'No');
      });
    } else {
      console.log('⚠️ No PMScan data available for collection at', new Date().toLocaleTimeString());
    }
  }

  private getCurrentLocation(): Promise<LocationData | undefined> {
    return new Promise((resolve) => {
      // Try to get current position with a short timeout
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const location: LocationData = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: new Date(),
            };
            resolve(location);
          },
          (error) => {
            console.log('📍 Could not get location for recording:', error.message);
            resolve(undefined);
          },
          { timeout: 1000, enableHighAccuracy: false }
        );
      } else {
        resolve(undefined);
      }
    });
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

    // Get clean timestamp as number to avoid Date object serialization issues
    const now = Date.now();
    
    // Create a completely serializable entry with numeric timestamps only
    const cleanEntry: SerializableRecordingEntry = {
      pmData: toSerializablePMScanData({
        ...pmData,
        timestamp: now,
      }),
      location: location ? toSerializableLocationData({
        ...location,
        timestamp: now,
      }) : undefined,
      context: {
        location: String(this.missionContext.location || ''),
        activity: String(this.missionContext.activity || ''),
      },
      timestamp: now,
    };

    this.recordingData.push(cleanEntry);
    
    // Use setTimeout to avoid potential postMessage conflicts
    setTimeout(() => {
      // Trigger React context update with a simple numeric payload
      const updateEvent = new CustomEvent('nativeDataAdded', { 
        detail: {
          count: this.recordingData.length,
          timestamp: now,
          pm25: Number(pmData.pm25) || 0
        }
      });
      
      window.dispatchEvent(updateEvent);
    }, 0);
    
    console.log('📊 Native data point added. Total:', this.recordingData.length);
  }

  updateMissionContext(location: string, activity: string): void {
    this.missionContext = { location, activity };
  }

  getRecordingData(): SerializableRecordingEntry[] {
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
  // Store a clean, serializable version with numeric timestamp
  (window as any).currentPMScanData = {
    pm1: data.pm1,
    pm25: data.pm25,
    pm10: data.pm10,
    temp: data.temp,
    humidity: data.humidity,
    battery: data.battery,
    charging: data.charging,
    timestamp: typeof data.timestamp === 'number' ? data.timestamp : new Date(data.timestamp).getTime(),
  };
}