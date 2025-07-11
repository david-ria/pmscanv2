import { useRef } from "react";
import { PMScanData } from "@/lib/pmscan/types";
import { LocationData } from "@/types/PMScan";
import { RecordingEntry } from "@/types/recording";
import { parseFrequencyToMs, shouldRecordData } from "@/lib/recordingUtils";
import { getBackgroundRecording } from "@/lib/pmscan/globalConnectionManager";

interface UseDataPointRecorderProps {
  isRecording: boolean;
  recordingFrequency: string;
  storeBackgroundData: (pmData: PMScanData, location?: LocationData, context?: { location: string; activity: string }) => void;
  addDataPointToState: (entry: RecordingEntry) => void;
  updateLastRecordedTime: (time: Date) => void;
}

export function useDataPointRecorder({
  isRecording,
  recordingFrequency,
  storeBackgroundData,
  addDataPointToState,
  updateLastRecordedTime,
}: UseDataPointRecorderProps) {
  const lastRecordedTime = useRef<Date | null>(null);

  const addDataPoint = (
    pmData: PMScanData, 
    location?: LocationData, 
    context?: { location: string; activity: string },
    automaticContext?: string
  ) => {
    console.log('📊 addDataPoint called:', {
      isRecording,
      recordingFrequency,
      lastRecordedTime: lastRecordedTime.current,
      pmData: {
        pm1: pmData.pm1,
        pm25: pmData.pm25,
        pm10: pmData.pm10,
        timestamp: pmData.timestamp
      },
      location
    });

    if (!isRecording) {
      console.log('❌ Not recording, skipping data point');
      return;
    }

    // Check if enough time has passed based on recording frequency
    const frequencyMs = parseFrequencyToMs(recordingFrequency);
    console.log('⏱️ Frequency check:', {
      frequencyMs,
      recordingFrequency,
      lastRecordedTime: lastRecordedTime.current,
      shouldRecord: shouldRecordData(lastRecordedTime.current, frequencyMs)
    });
    
    if (!shouldRecordData(lastRecordedTime.current, frequencyMs)) {
      console.log('⏭️ Skipping data point - not enough time passed');
      return;
    }
    
    console.log('✅ Recording data point');
    
    // Update last recorded time
    const currentTime = new Date();
    lastRecordedTime.current = currentTime;
    updateLastRecordedTime(currentTime);
    
    // Use a unique timestamp for each data point
    const uniqueTimestamp = new Date();
    const pmDataWithUniqueTimestamp = {
      ...pmData,
      timestamp: uniqueTimestamp
    };
    
    const entry: RecordingEntry = {
      pmData: pmDataWithUniqueTimestamp,
      location,
      context,
      automaticContext
    };

    console.log('📝 Adding entry to recording data:', entry);

    // Store data for background processing if background mode is enabled
    if (getBackgroundRecording()) {
      console.log('💾 Storing background data');
      storeBackgroundData(pmDataWithUniqueTimestamp, location, context);
    }

    // Add to recording data
    addDataPointToState(entry);
    console.log('✅ Data point added successfully');
  };

  return {
    addDataPoint,
  };
}