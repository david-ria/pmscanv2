import { Play, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRecordingContext } from "@/contexts/RecordingContext";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { frequencyOptionKeys } from "@/lib/recordingConstants";
import { useTranslation } from "react-i18next";
import { RecordingFrequencyDialog } from "./RecordingControls/RecordingFrequencyDialog";
import { MissionDetailsDialog } from "./RecordingControls/MissionDetailsDialog";

interface FloatingRecordButtonProps {
  device?: any;
  className?: string;
}

export function FloatingRecordButton({ device, className }: FloatingRecordButtonProps) {
  const { t } = useTranslation();
  const [showFrequencyDialog, setShowFrequencyDialog] = useState(false);
  const [showMissionDialog, setShowMissionDialog] = useState(false);
  const [recordingFrequency, setRecordingFrequency] = useState<string>("10s");
  const [missionName, setMissionName] = useState<string>("");
  const [shareData, setShareData] = useState<boolean>(false);
  const { toast } = useToast();
  const { startRecording, stopRecording, saveMission, isRecording, clearRecordingData, missionContext } = useRecordingContext();

  const getFrequencyLabel = (frequency: string) => {
    const option = frequencyOptionKeys.find(f => f.value === frequency);
    return option ? t(`modals.frequency.${option.key}`) : frequency;
  };

  const handleStartRecording = () => {
    setShowFrequencyDialog(true);
  };

  const confirmStartRecording = () => {
    setShowFrequencyDialog(false);
    startRecording(recordingFrequency);
    toast({
      title: t('realTime.recording'),
      description: `${t('modals.recordingFrequency.chooseMeasureFrequency')} ${getFrequencyLabel(recordingFrequency)}`,
    });
  };

  const handleStopRecording = () => {
    setShowMissionDialog(true);
  };

  const confirmStopRecording = () => {
    let finalMissionName = missionName.trim();
    
    if (!finalMissionName) {
      const now = new Date();
      finalMissionName = `Mission ${now.toLocaleDateString('fr-FR')} ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    }

    try {
      saveMission(
        finalMissionName,
        missionContext?.location,
        missionContext?.activity,
        recordingFrequency,
        shareData
      );

      stopRecording();
      setShowMissionDialog(false);
      
      toast({
        title: t('history.export'),
        description: `"${finalMissionName}" ${t('history.export')}`,
      });

      setMissionName("");
      setShareData(false);
    } catch (error) {
      console.error('Error saving mission:', error);
      const errorMessage = error instanceof Error ? error.message : t('analysis.error');
      toast({
        title: t('analysis.error'),
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const handleDiscardMission = () => {
    stopRecording();
    clearRecordingData();
    setShowMissionDialog(false);
    
    setMissionName("");
    setShareData(false);
    
    toast({
      title: t('modals.missionDetails.delete'),
      description: t('analysis.error'), // TODO: Add proper translation
    });
  };

  const handleRecordingClick = () => {
    if (isRecording) {
      handleStopRecording();
    } else {
      handleStartRecording();
    }
  };

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <button
        onClick={handleRecordingClick}
        className={cn(
          "h-16 w-16 rounded-full flex items-center justify-center transition-all duration-200",
          "hover:scale-105 active:scale-95 shadow-xl",
          isRecording 
            ? "bg-destructive text-destructive-foreground animate-pulse" 
            : "bg-primary text-primary-foreground hover:shadow-2xl"
        )}
        type="button"
      >
        {isRecording ? (
          <Square className="h-6 w-6" />
        ) : (
          <Play className="h-6 w-6" />
        )}
      </button>

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
        onDiscard={handleDiscardMission}
      />
    </div>
  );
}