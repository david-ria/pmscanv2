import { useState, useRef } from "react";
import { RecordingEntry, MissionContext, RecordingConfig } from "@/types/recording";
import { setGlobalRecording } from "@/lib/pmscan/globalConnectionManager";

export function useRecordingState() {
  const [recordingData, setRecordingData] = useState<RecordingEntry[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingFrequency, setRecordingFrequency] = useState<string>("30s");
  const [missionContext, setMissionContext] = useState<MissionContext>({ 
    location: "", 
    activity: "" 
  });
  
  const recordingStartTime = useRef<Date | null>(null);
  const lastRecordedTime = useRef<Date | null>(null);

  const startRecording = (frequency: string = "30s") => {
    console.log("🎬 Starting recording with frequency:", frequency);
    setIsRecording(true);
    setRecordingData([]);
    setRecordingFrequency(frequency);
    recordingStartTime.current = new Date();
    lastRecordedTime.current = null;
    
    // Set global recording state to prevent disconnection during navigation
    setGlobalRecording(true);
    
    console.log("✅ Recording started! isRecording should now be:", true);
  };

  const stopRecording = () => {
    setIsRecording(false);
    
    // Clear global recording state to allow disconnection
    setGlobalRecording(false);
  };

  const addDataPoint = (entry: RecordingEntry) => {
    setRecordingData(prev => {
      const updated = [...prev, entry];
      console.log("📊 Recording data updated, total points:", updated.length);
      return updated;
    });
  };

  const clearRecordingData = () => {
    setRecordingData([]);
    recordingStartTime.current = null;
    lastRecordedTime.current = null;
  };

  const updateMissionContext = (location: string, activity: string) => {
    setMissionContext({ location, activity });
  };

  const updateLastRecordedTime = (time: Date) => {
    lastRecordedTime.current = time;
  };

  return {
    // State
    recordingData,
    isRecording,
    recordingFrequency,
    missionContext,
    recordingStartTime: recordingStartTime.current,
    lastRecordedTime: lastRecordedTime.current,
    
    // Actions
    startRecording,
    stopRecording,
    addDataPoint,
    clearRecordingData,
    updateMissionContext,
    updateLastRecordedTime,
  };
}