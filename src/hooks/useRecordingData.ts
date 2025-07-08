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
    setIsRecording(true);
    setRecordingData([]);
    recordingStartTime.current = new Date();
    console.log("✅ Recording started!");
  };

  const stopRecording = () => {
    setIsRecording(false);
  };

  const addDataPoint = (pmData: PMScanData, location?: LocationData) => {
    if (!isRecording) return;

    const entry: RecordingEntry = {
      pmData,
      location
    };

    setRecordingData(prev => [...prev, entry]);
  };

  const saveMission = (
    missionName: string,
    locationContext?: string,
    activityContext?: string,
    recordingFrequency?: string,
    shared?: boolean
  ) => {
    if (!recordingStartTime.current || recordingData.length === 0) {
      throw new Error("No recording data to save");
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
      shared
    );

    // Save locally
    dataStorage.saveMissionLocally(mission);

    // Try to sync immediately if online
    if (navigator.onLine) {
      dataStorage.syncPendingMissions().catch(console.error);
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