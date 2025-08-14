import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRecordingService } from '@/hooks/useRecordingService';
import { cn } from '@/lib/utils';
import { frequencyOptionKeys } from '@/lib/recordingConstants';
import { useTranslation } from 'react-i18next';
import * as logger from '@/utils/logger';
import { RecordingButton } from './RecordingControls/RecordingButton';
import { ContextSelectors } from './RecordingControls/ContextSelectors';
import { RecordingFrequencyDialog } from './RecordingControls/RecordingFrequencyDialog';
import { MissionDetailsDialog } from './RecordingControls/MissionDetailsDialog';

interface RecordingControlsProps {
  isRecording: boolean;
  onToggleRecording: () => void;
  device?: {
    id: string;
    name: string;
    connected: boolean;
  };
  className?: string;
}

export function RecordingControls({
  isRecording,
  onToggleRecording,
  device,
  className,
}: RecordingControlsProps) {
  const { t } = useTranslation();
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedActivity, setSelectedActivity] = useState<string>('');
  const [showFrequencyDialog, setShowFrequencyDialog] = useState(false);
  const [showMissionDialog, setShowMissionDialog] = useState(false);
  const [recordingFrequency, setRecordingFrequency] = useState<string>('10s');
  const [missionName, setMissionName] = useState<string>('');
  const [shareData, setShareData] = useState<boolean>(false);
  const { toast } = useToast();
  const {
    startRecording,
    stopRecording,
    updateMissionContext,
    isRecording: contextIsRecording,
    clearRecordingData,
  } = useRecordingService();

  const getFrequencyLabel = (frequency: string) => {
    const option = frequencyOptionKeys.find((f) => f.value === frequency);
    return option ? t(`modals.frequency.${option.key}`) : frequency;
  };

  const handleStartRecording = () => {
    logger.debug('🎯 handleStartRecording called');
    setShowFrequencyDialog(true);
  };

  const confirmStartRecording = () => {
    logger.debug('⚡ Confirming start recording...');
    setShowFrequencyDialog(false);
    startRecording(recordingFrequency); // Pass the frequency here
    logger.debug(
      '📞 Called startRecording function with frequency:',
      recordingFrequency
    );
    toast({
      title: t('realTime.recording'),
      description: `${t('modals.recordingFrequency.chooseMeasureFrequency')} ${getFrequencyLabel(recordingFrequency)}`,
    });
  };

  const handleStopRecording = () => {
    setShowMissionDialog(true);
  };

  const confirmStopRecording = async () => {
    let finalMissionName = missionName.trim();

    // If no mission name provided, use current date and time
    if (!finalMissionName) {
      const now = new Date();
      finalMissionName = `Mission ${now.toLocaleDateString('fr-FR')} ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    }

    try {
      // TODO: Implement mission saving logic
      // For now, just stop recording
      stopRecording();
      setShowMissionDialog(false);

      toast({
        title: 'Mission sauvegardée',
        description: `"${finalMissionName}" exportée en CSV`,
      });

      // Reset form
      setMissionName('');
      setShareData(false);
      setSelectedLocation('');
      setSelectedActivity('');
    } catch (error) {
      console.error('Error saving mission:', error);
      const errorMessage =
        error instanceof Error ? error.message : "Erreur lors de l'export CSV";
      toast({
        title: 'Erreur',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const handleDiscardMission = () => {
    // Discard the mission without saving
    stopRecording();
    clearRecordingData();
    setShowMissionDialog(false);

    // Reset form
    setMissionName('');
    setShareData(false);
    setSelectedLocation('');
    setSelectedActivity('');

    toast({
      title: 'Mission supprimée',
      description: 'Les données ont été supprimées sans sauvegarde',
    });
  };

  const handleRecordingClick = () => {
    logger.debug(
      '🔴 Recording button clicked! contextIsRecording:',
      contextIsRecording
    );
    if (contextIsRecording) {
      logger.debug('⏹️ Stopping recording...');
      handleStopRecording();
    } else {
      logger.debug('▶️ Starting recording...');
      handleStartRecording();
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      <RecordingButton
        isRecording={contextIsRecording}
        onClick={handleRecordingClick}
        recordingFrequency={recordingFrequency}
      />

      <ContextSelectors
        selectedLocation={selectedLocation}
        onLocationChange={(location) => {
          setSelectedLocation(location);
          // Only update mission context if recording to avoid conflicts
          if (contextIsRecording) {
            updateMissionContext(location, selectedActivity);
          }
        }}
        selectedActivity={selectedActivity}
        onActivityChange={(activity) => {
          setSelectedActivity(activity);
          // Only update mission context if recording to avoid conflicts
          if (contextIsRecording) {
            updateMissionContext(selectedLocation, activity);
          }
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
        onDiscard={handleDiscardMission}
      />
    </div>
  );
}
