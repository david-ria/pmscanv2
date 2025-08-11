import { PMScanData } from '@/lib/pmscan/types';
import { LocationData } from '@/types/PMScan';

export interface RecordingEntry {
  pmData: PMScanData;
  location?: LocationData;
  context?: {
    location: string;
    activity: string;
  };
  automaticContext?: string;
  timestamp: number; // epoch ms UTC
  weatherDataId?: string; // Still needed for recording, will be moved to mission level
}

export interface MissionContext {
  location: string;
  activity: string;
}

export interface RecordingConfig {
  frequency: string;
  startTime: number | null; // epoch ms UTC
  lastRecordedTime: number | null; // epoch ms UTC
}
