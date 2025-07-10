import { useEffect } from "react";
import { dataStorage } from "@/lib/dataStorage";
import { PMScanData } from "@/lib/pmscan/types";
import { LocationData } from "@/types/PMScan";
import { RecordingEntry } from "@/types/recording";
import { useRecordingState } from "./useRecordingState";
import { useBackgroundRecordingIntegration } from "./useBackgroundRecordingIntegration";
import { setGlobalRecording, setBackgroundRecording, getBackgroundRecording } from "@/lib/pmscan/globalConnectionManager";
import { parseFrequencyToMs, shouldRecordData } from "@/lib/recordingUtils";

export function useRecordingData() {
  const {
    recordingData,
    isRecording,
    recordingFrequency,
    missionContext,
    recordingStartTime,
    lastRecordedTime,
    startRecording: startRecordingState,
    stopRecording: stopRecordingState,
    addDataPoint: addDataPointToState,
    clearRecordingData,
    updateMissionContext,
    updateLastRecordedTime,
  } = useRecordingState();

  const {
    enableRecordingBackground,
    disableRecordingBackground,
    storeBackgroundData,
  } = useBackgroundRecordingIntegration();

  // Monitor recording state changes
  useEffect(() => {
    // Only log significant state changes
    if (isRecording) {
      console.log("🎬 Recording started");
    }
  }, [isRecording]);

  // Auto-sync when coming online
  useEffect(() => {
    const handleOnline = () => {
      dataStorage.syncPendingMissions().catch(console.error);
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  // Sync on app load if online
  useEffect(() => {
    if (navigator.onLine) {
      dataStorage.syncPendingMissions().catch(console.error);
    }
  }, []);

  const startRecording = async (frequency: string = "10s") => {
    startRecordingState(frequency);
    setGlobalRecording(true);
    
    // Enable background recording if background mode is active
    if (getBackgroundRecording()) {
      await enableRecordingBackground(frequency);
    }
  };

  const stopRecording = async () => {
    stopRecordingState();
    setGlobalRecording(false);
    
    // Disable background recording when stopping
    await disableRecordingBackground();
  };

  const addDataPoint = (
    pmData: PMScanData, 
    location?: LocationData, 
    context?: { location: string; activity: string }
  ) => {
    console.log('📊 addDataPoint called:', {
      isRecording,
      recordingFrequency,
      lastRecordedTime,
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
      lastRecordedTime,
      shouldRecord: shouldRecordData(lastRecordedTime, frequencyMs)
    });
    
    if (!shouldRecordData(lastRecordedTime, frequencyMs)) {
      console.log('⏭️ Skipping data point - not enough time passed');
      return;
    }
    
    console.log('✅ Recording data point');
    
    // Update last recorded time
    const currentTime = new Date();
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
      context
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

  const saveMission = (
    missionName: string,
    locationContext?: string,
    activityContext?: string,
    recordingFrequency?: string,
    shared?: boolean,
    deviceId?: string,
    deviceName?: string
  ) => {
    
    if (!recordingStartTime) {
      throw new Error("Aucun enregistrement en cours à sauvegarder");
    }
    
    if (recordingData.length === 0) {
      throw new Error("Aucune donnée enregistrée pour créer la mission");
    }

    const endTime = new Date();
    const mission = dataStorage.createMissionFromRecording(
      recordingData,
      missionName,
      recordingStartTime,
      endTime,
      locationContext,
      activityContext,
      recordingFrequency,
      shared,
      deviceId,
      deviceName
    );

    // Export to CSV immediately without storing locally first
    dataStorage.exportMissionToCSV(mission);

    // Try to sync to database if online (but don't store locally)
    if (navigator.onLine) {
      // Create a temporary mission for database sync only
      try {
        dataStorage.saveMissionLocally(mission);
        dataStorage.syncPendingMissions().catch(console.error);
        // Clear storage immediately after sync attempt
        dataStorage.clearLocalStorage();
      } catch (storageError) {
        console.warn('Local storage failed, but CSV exported successfully');
      }
    }

    // Clear recording data
    clearRecordingData();

    return mission;
  };

  return {
    recordingData,
    isRecording,
    missionContext,
    startRecording,
    stopRecording,
    addDataPoint,
    saveMission,
    clearRecordingData,
    updateMissionContext,
    recordingStartTime
  };
}