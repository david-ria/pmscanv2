import { useState, useEffect, useRef } from "react";
import { dataStorage, MissionData } from "@/lib/dataStorage";
import { PMScanData } from "@/lib/pmscan/types";
import { LocationData } from "@/types/PMScan";

interface RecordingEntry {
  pmData: PMScanData;
  location?: LocationData;
}

export function useRecordingData() {
  const [recordingData, setRecordingData] = useState<RecordingEntry[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [missionContext, setMissionContext] = useState<{
    location: string;
    activity: string;
  }>({ location: "", activity: "" });
  const recordingStartTime = useRef<Date | null>(null);

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

  const startRecording = () => {
    console.log("🎬 Starting recording...");
    console.log("🔄 Setting isRecording to true");
    setIsRecording(true);
    setRecordingData([]);
    recordingStartTime.current = new Date();
    console.log("✅ Recording started! isRecording should now be:", true);
  };

  const stopRecording = () => {
    setIsRecording(false);
  };

  const addDataPoint = (pmData: PMScanData, location?: LocationData) => {
    console.log("🎯 addDataPoint called - isRecording:", isRecording, "pmData:", pmData?.pm25);
    if (!isRecording) {
      console.log("❌ Not recording, skipping data point");
      return;
    }

    console.log("✅ Adding data point to recording!");
    const entry: RecordingEntry = {
      pmData,
      location
    };

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