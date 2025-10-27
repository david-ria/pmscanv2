import { PMScanData } from '@/lib/pmscan/types';
import { LocationData } from '@/types/PMScan';

export interface RecordingEntry {
  pmData: PMScanData;
  location?: LocationData;
  manualContext?: {
    location: string;
    activity: string;
  };
  automaticContext?: string; // Autocontext from sensors + heuristics
  enrichedLocation?: string; // NEW: Location enrichment from GPS coordinates
  geohash?: string; // NEW: Geohash for spatial indexing and privacy
  timestamp: Date;
  weatherDataId?: string; // Still needed for recording, will be moved to mission level
}

export interface MissionContext {
  location: string;
  activity: string;
}

export interface RecordingConfig {
  frequency: string;
  startTime: Date | null;
  lastRecordedTime: Date | null;
}
