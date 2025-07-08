import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useRecordingContext } from "@/contexts/RecordingContext";
import { cn } from "@/lib/utils";
import { frequencyOptions } from "@/lib/recordingConstants";
import { RecordingButton } from "./RecordingControls/RecordingButton";
import { ContextSelectors } from "./RecordingControls/ContextSelectors";
import { RecordingFrequencyDialog } from "./RecordingControls/RecordingFrequencyDialog";
import { MissionDetailsDialog } from "./RecordingControls/MissionDetailsDialog";

interface RecordingControlsProps {
  isRecording: boolean;
  onToggleRecording: () => void;
  device?: any; // PMScanDevice
  className?: string;
}

export function RecordingControls({ isRecording, onToggleRecording, device, className }: RecordingControlsProps) {
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [selectedActivity, setSelectedActivity] = useState<string>("");
  const [showFrequencyDialog, setShowFrequencyDialog] = useState(false);
  const [showMissionDialog, setShowMissionDialog] = useState(false);
  const [recordingFrequency, setRecordingFrequency] = useState<string>("30s");
  const [missionName, setMissionName] = useState<string>("");
  const [shareData, setShareData] = useState<boolean>(false);
  const { toast } = useToast();
  const { startRecording, stopRecording, saveMission, updateMissionContext, isRecording: contextIsRecording } = useRecordingContext();

  const handleStartRecording = () => {
    console.log("🎯 handleStartRecording called");
    setShowFrequencyDialog(true);
  };

  const confirmStartRecording = () => {
    console.log("⚡ Confirming start recording...");
    setShowFrequencyDialog(false);
    startRecording(); // Use the hook's startRecording
    console.log("📞 Called startRecording function");
    toast({
      title: "Enregistrement démarré",
      description: `Fréquence: ${frequencyOptions.find(f => f.value === recordingFrequency)?.label}`,
    });
  };

  const handleStopRecording = () => {
    setShowMissionDialog(true);
  };

  const confirmStopRecording = () => {
    let finalMissionName = missionName.trim();
    
    // If no mission name provided, use current date and time
    if (!finalMissionName) {
      const now = new Date();
      finalMissionName = `Mission ${now.toLocaleDateString('fr-FR')} ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    }

    try {
      // Save the mission with all context including device info
      saveMission(
        finalMissionName,
        selectedLocation || undefined,
        selectedActivity || undefined,
        recordingFrequency,
        shareData,
        device?.id || device?.gatt?.device?.id,
        device?.name
      );

      stopRecording();
      setShowMissionDialog(false);
      
      toast({
        title: "Mission sauvegardée",
        description: `"${finalMissionName}" exportée en CSV et stockage vidé`,
      });

      // Reset form
      setMissionName("");
      setShareData(false);
      setSelectedLocation("");
      setSelectedActivity("");
    } catch (error) {
      console.error('Error saving mission:', error);
      const errorMessage = error instanceof Error ? error.message : "Impossible de sauvegarder la mission";
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const handleRecordingClick = () => {
    console.log("🔴 Recording button clicked! contextIsRecording:", contextIsRecording);
    if (contextIsRecording) {
      console.log("⏹️ Stopping recording...");
      handleStopRecording();
    } else {
      console.log("▶️ Starting recording...");
      handleStartRecording();
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      <RecordingButton 
        isRecording={contextIsRecording}
        onClick={handleRecordingClick}
        recordingFrequency={recordingFrequency}
      />

      <ContextSelectors 
        selectedLocation={selectedLocation}
        onLocationChange={(location) => {
          setSelectedLocation(location);
          updateMissionContext(location, selectedActivity);
        }}
        selectedActivity={selectedActivity}
        onActivityChange={(activity) => {
          setSelectedActivity(activity);
          updateMissionContext(selectedLocation, activity);
        }}
        isRecording={contextIsRecording}
      />

      <RecordingFrequencyDialog 
        open={showFrequencyDialog}
        onOpenChange={setShowFrequencyDialog}
        recordingFrequency={recordingFrequency}
        onFrequencyChange={setRecordingFrequency}
        onConfirm={confirmStartRecording}
      />

      <MissionDetailsDialog 
        open={showMissionDialog}
        onOpenChange={setShowMissionDialog}
        missionName={missionName}
        onMissionNameChange={setMissionName}
        shareData={shareData}
        onShareDataChange={setShareData}
        onConfirm={confirmStopRecording}
      />
    </div>
  );
}