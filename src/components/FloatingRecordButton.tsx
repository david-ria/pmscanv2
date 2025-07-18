import { Play, Square, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRecordingContext } from '@/contexts/RecordingContext';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { frequencyOptionKeys } from '@/lib/recordingConstants';
import { useTranslation } from 'react-i18next';
import { RecordingFrequencyDialog } from './RecordingControls/RecordingFrequencyDialog';
import { MissionDetailsDialog } from './RecordingControls/MissionDetailsDialog';
import { ConnectionDialog } from './ConnectionDialog';
import { EventButton } from './RecordingControls/EventButton';
import { useDialogs } from '@/hooks/useDialog';
import { ConnectionStatus, PMScanDevice, LocationData } from '@/types/PMScan';

interface FloatingRecordButtonProps {
  device?: PMScanDevice;
  isConnected?: boolean;
  connectionStatus?: ConnectionStatus;
  locationEnabled?: boolean;
  latestLocation?: LocationData | null;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onRequestLocationPermission?: () => Promise<boolean>;
  className?: string;
}

export function FloatingRecordButton({
  device,
  isConnected = false,
  connectionStatus = { connected: false, connecting: false, error: null },
  locationEnabled = false,
  latestLocation = null,
  onConnect = () => {},
  onDisconnect = () => {},
  onRequestLocationPermission = async () => false,
  className,
}: FloatingRecordButtonProps) {
  const { t } = useTranslation();
  const { dialogs, openDialog, closeDialog, getOnOpenChange } = useDialogs({
    frequency: false,
    mission: false,
    connection: false
  });
  const [recordingFrequency, setRecordingFrequency] = useState<string>('10s');
  const [missionName, setMissionName] = useState<string>('');
  const [shareData, setShareData] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const { toast } = useToast();
  const {
    startRecording,
    stopRecording,
    saveMission,
    isRecording,
    clearRecordingData,
    missionContext,
    recordingStartTime,
  } = useRecordingContext();

  // Auto-proceed to frequency selection when device becomes connected
  useEffect(() => {
    if (isConnected && dialogs.connection) {
      closeDialog('connection');
      openDialog('frequency');
    }
  }, [isConnected, dialogs.connection, closeDialog, openDialog]);

  // Timer effect for recording duration
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRecording && recordingStartTime) {
      interval = setInterval(() => {
        const now = new Date();
        const diff = Math.floor((now.getTime() - recordingStartTime.getTime()) / 1000);
        setRecordingTime(diff);
      }, 1000);
    } else {
      setRecordingTime(0);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRecording, recordingStartTime]);

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getFrequencyLabel = (frequency: string) => {
    const option = frequencyOptionKeys.find((f) => f.value === frequency);
    return option ? t(`modals.frequency.${option.key}`) : frequency;
  };

  const handleStartRecording = () => {
    // Check if PMScan device is connected
    if (!isConnected) {
      openDialog('connection');
      return;
    }
    // Go directly to frequency selection when device is connected
    openDialog('frequency');
  };

  const confirmStartRecording = () => {
    closeDialog('frequency');
    closeDialog('connection'); // Close connection dialog when recording starts
    startRecording(recordingFrequency);
    toast({
      title: t('realTime.recording'),
      description: `${t('modals.recordingFrequency.chooseMeasureFrequency')} ${getFrequencyLabel(recordingFrequency)}`,
    });
  };

  const handleStopRecording = () => {
    openDialog('mission');
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
      closeDialog('mission');

      toast({
        title: t('history.export'),
        description: `"${finalMissionName}" ${t('history.export')}`,
      });

      setMissionName('');
      setShareData(false);
    } catch (error) {
      console.error('Error saving mission:', error);
      const errorMessage =
        error instanceof Error ? error.message : t('analysis.error');
      toast({
        title: t('analysis.error'),
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const handleDiscardMission = () => {
    stopRecording();
    clearRecordingData();
    closeDialog('mission');

    setMissionName('');
    setShareData(false);

    toast({
      title: t('modals.missionDetails.delete'),
      description: t('modals.missionDetails.discarded'),
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
    <div className={cn('flex items-center gap-4', className)}>
      {/* Chronometer - only show when recording */}
      {isRecording && (
        <div className="flex items-center gap-2 bg-card px-3 py-2 rounded-lg border shadow-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono text-sm font-medium">
            {formatTime(recordingTime)}
          </span>
        </div>
      )}
      
      {/* Record Button */}
      <button
        onClick={handleRecordingClick}
        className={cn(
          'h-16 w-16 rounded-full flex items-center justify-center transition-all duration-200',
          'hover:scale-105 active:scale-95 shadow-xl',
          isRecording
            ? 'bg-destructive text-destructive-foreground animate-slow-pulse'
            : 'bg-primary text-primary-foreground hover:shadow-2xl'
        )}
        type="button"
      >
        {isRecording ? (
          <Square className="h-6 w-6" />
        ) : (
          <Play className="h-6 w-6" />
        )}
      </button>

      {/* Event Button - positioned next to record button */}
      <EventButton isRecording={isRecording} />

      <RecordingFrequencyDialog
        open={dialogs.frequency}
        onOpenChange={getOnOpenChange('frequency')}
        recordingFrequency={recordingFrequency}
        onFrequencyChange={setRecordingFrequency}
        onConfirm={confirmStartRecording}
      />

      <MissionDetailsDialog
        open={dialogs.mission}
        onOpenChange={getOnOpenChange('mission')}
        missionName={missionName}
        onMissionNameChange={setMissionName}
        shareData={shareData}
        onShareDataChange={setShareData}
        onConfirm={confirmStopRecording}
        onDiscard={handleDiscardMission}
      />

      <ConnectionDialog
        open={dialogs.connection}
        onOpenChange={getOnOpenChange('connection')}
        connectionStatus={connectionStatus}
        deviceInfo={
          device || {
            name: '',
            connected: false,
            battery: 0,
            charging: false,
            version: 0,
            mode: 0,
            interval: 0,
          }
        }
        locationEnabled={locationEnabled}
        latestLocation={latestLocation}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
        onRequestLocationPermission={onRequestLocationPermission}
      />
    </div>
  );
}
