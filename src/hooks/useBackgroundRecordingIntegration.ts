import { useBackgroundRecording } from "./useBackgroundRecording";
import { parseFrequencyToMs } from "@/lib/recordingUtils";
import { PMScanData } from "@/lib/pmscan/types";
import { LocationData } from "@/types/PMScan";

export function useBackgroundRecordingIntegration() {
  const { 
    isBackgroundEnabled, 
    enableBackgroundRecording, 
    disableBackgroundRecording,
    storeDataForBackground 
  } = useBackgroundRecording();

  const enableRecordingBackground = async (frequency: string) => {
    try {
      await enableBackgroundRecording({
        enableWakeLock: true,
        enableNotifications: true,
        syncInterval: parseFrequencyToMs(frequency)
      });
      console.log("🎯 Background recording enabled");
    } catch (error) {
      console.warn("⚠️ Background recording failed to enable:", error);
    }
  };

  const disableRecordingBackground = async () => {
    try {
      await disableBackgroundRecording();
      console.log("🛑 Background recording disabled");
    } catch (error) {
      console.warn("⚠️ Background recording failed to disable:", error);
    }
  };

  const storeBackgroundData = (
    pmData: PMScanData, 
    location?: LocationData, 
    context?: { location: string; activity: string }
  ) => {
    if (isBackgroundEnabled) {
      storeDataForBackground(pmData, location, context);
    }
  };

  return {
    isBackgroundEnabled,
    enableRecordingBackground,
    disableRecordingBackground,
    storeBackgroundData,
  };
}