import { useEffect } from "react";
import { PMScanData } from "@/lib/pmscan/types";
import { LocationData } from "@/types/PMScan";
import { useRecordingState } from "./useRecordingState";
import { useBackgroundRecordingIntegration } from "./useBackgroundRecordingIntegration";
import { useMissionSaver } from "./useMissionSaver";
import { useAutoSync } from "./useAutoSync";
import { useDataPointRecorder } from "./useDataPointRecorder";
import { setGlobalRecording, setBackgroundRecording, getBackgroundRecording } from "@/lib/pmscan/globalConnectionManager";

export function useRecordingData() {
  const {
    recordingData,
    isRecording,
    recordingFrequency,
    missionContext,
    recordingStartTime,
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

  const { saveMission: saveMissionHelper } = useMissionSaver();

  const { addDataPoint } = useDataPointRecorder({
    isRecording,
    recordingFrequency,
    storeBackgroundData,
    addDataPointToState,
    updateLastRecordedTime,
  });

  // Use auto-sync functionality
  useAutoSync();

  // Monitor recording state changes
  useEffect(() => {
    // Only log significant state changes
    if (isRecording) {
      console.log("🎬 Recording started");
    }
  }, [isRecording]);

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

  const saveMission = (
    missionName: string,
    locationContext?: string,
    activityContext?: string,
    recordingFrequency?: string,
    shared?: boolean
  ) => {
    const mission = saveMissionHelper(
      recordingData,
      recordingStartTime,
      missionName,
      locationContext,
      activityContext,
      recordingFrequency,
      shared
    );

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