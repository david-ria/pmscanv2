import { PMScanData } from "@/lib/pmscan/types";
import { LocationData } from "@/types/PMScan";

export interface RecordingEntry {
  pmData: PMScanData;
  location?: LocationData;
  context?: {
    location: string;
    activity: string;
  };
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