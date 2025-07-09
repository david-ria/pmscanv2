import { useState, useEffect, useRef } from "react";
import { dataStorage, MissionData } from "@/lib/dataStorage";
import { PMScanData } from "@/lib/pmscan/types";
import { LocationData } from "@/types/PMScan";
import { useBackgroundRecording } from "./useBackgroundRecording";

interface RecordingEntry {
  pmData: PMScanData;
  location?: LocationData;
  context?: {
    location: string;
    activity: string;
  };
}

export function useRecordingData() {
  const [recordingData, setRecordingData] = useState<RecordingEntry[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingFrequency, setRecordingFrequency] = useState<string>("30s");
  const [missionContext, setMissionContext] = useState<{
    location: string;
    activity: string;
  }>({ location: "", activity: "" });
  const recordingStartTime = useRef<Date | null>(null);
  const lastRecordedTime = useRef<Date | null>(null);
  
  // Initialize background recording capabilities
  const { 
    isBackgroundEnabled, 
    enableBackgroundRecording, 
    disableBackgroundRecording,
    storeDataForBackground 
  } = useBackgroundRecording();

  // Debug: Log when isRecording changes
  useEffect(() => {
    console.log("🚨 isRecording state changed to:", isRecording);
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

  // Helper function to parse frequency string to milliseconds
  const parseFrequencyToMs = (frequency: string): number => {
    const number = parseInt(frequency);
    if (frequency.includes('s')) {
      return number * 1000; // seconds to milliseconds
    } else if (frequency.includes('m')) {
      return number * 60 * 1000; // minutes to milliseconds
    }
    return 30000; // default 30 seconds
  };

  const startRecording = async (frequency: string = "30s") => {
    console.log("🎬 Starting recording with frequency:", frequency);
    console.log("🔄 Setting isRecording to true");
    setIsRecording(true);
    setRecordingData([]);
    setRecordingFrequency(frequency);
    recordingStartTime.current = new Date();
    lastRecordedTime.current = null; // Reset for new recording
    
    // Enable background recording capabilities
    try {
      await enableBackgroundRecording({
        enableWakeLock: true,
        enableNotifications: true,
        syncInterval: parseFrequencyToMs(frequency) // Use recording frequency for sync
      });
      console.log("🎯 Background recording enabled");
    } catch (error) {
      console.warn("⚠️ Background recording failed to enable:", error);
    }
    
    console.log("✅ Recording started! isRecording should now be:", true);
  };

  const stopRecording = async () => {
    setIsRecording(false);
    
    // Disable background recording capabilities
    try {
      await disableBackgroundRecording();
      console.log("🛑 Background recording disabled");
    } catch (error) {
      console.warn("⚠️ Background recording failed to disable:", error);
    }
  };

  const addDataPoint = (pmData: PMScanData, location?: LocationData, context?: { location: string; activity: string }) => {
    console.log("🎯 addDataPoint called - isRecording:", isRecording, "pmData:", pmData?.pm25, "location:", location, "context:", context);
    if (!isRecording) {
      console.log("❌ Not recording, skipping data point");
      return;
    }

    // Check if enough time has passed based on recording frequency
    const currentTime = new Date();
    const frequencyMs = parseFrequencyToMs(recordingFrequency);
    
    if (lastRecordedTime.current && 
        (currentTime.getTime() - lastRecordedTime.current.getTime()) < frequencyMs) {
      console.log(`⏳ Throttling: only ${currentTime.getTime() - lastRecordedTime.current.getTime()}ms passed, need ${frequencyMs}ms`);
      return;
    }

    console.log("✅ Adding data point to recording with context:", context);
    lastRecordedTime.current = currentTime;
    
    // Use a unique timestamp for each data point (current time with milliseconds)
    // This ensures each measurement has a unique, chronological timestamp
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

    // Store data for background processing if enabled
    if (isBackgroundEnabled) {
      storeDataForBackground(pmDataWithUniqueTimestamp, location, context);
    }

    setRecordingData(prev => {
      const updated = [...prev, entry];
      console.log("📊 Recording data updated, total points:", updated.length);
      return updated;
    });
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
    console.log("🎯 saveMission called - recordingData length:", recordingData.length, "recordingStartTime:", recordingStartTime.current);
    
    if (!recordingStartTime.current) {
      throw new Error("Aucun enregistrement en cours à sauvegarder");
    }
    
    if (recordingData.length === 0) {
      throw new Error("Aucune donnée enregistrée pour créer la mission");
    }

    const endTime = new Date();
    const mission = dataStorage.createMissionFromRecording(
      recordingData,
      missionName,
      recordingStartTime.current,
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
    setRecordingData([]);
    recordingStartTime.current = null;

    return mission;
  };

  const clearRecordingData = () => {
    setRecordingData([]);
    recordingStartTime.current = null;
  };

  const updateMissionContext = (location: string, activity: string) => {
    setMissionContext({ location, activity });
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
    recordingStartTime: recordingStartTime.current
  };
}