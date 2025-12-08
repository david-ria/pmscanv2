import { SensorReadingData } from '@/types/sensor';
import { LocationData } from '@/types/PMScan';

export interface RecordingEntry {
  pmData: SensorReadingData;
  location?: LocationData;
  manualContext?: {
    location: string;
    activity: string;
  };
  automaticContext?: string; // Autocontext from sensors + heuristics
  enrichedLocation?: string; // Location enrichment from GPS coordinates
  geohash?: string; // Geohash for spatial indexing and privacy
  weatherDataId?: string; // Weather data ID for this recording entry
  timestamp: Date;
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
