import { Play, Square, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { frequencyOptionKeys } from '@/lib/recordingConstants';
import { useTranslation } from 'react-i18next';
import { createTimestamp, formatDuration } from '@/utils/timeFormat';
import { RecordingFrequencyDialog } from './RecordingControls/RecordingFrequencyDialog';
import { MissionDetailsDialog } from './RecordingControls/MissionDetailsDialog';
import { ConnectionDialog } from './ConnectionDialog';
import { EventButton } from './RecordingControls/EventButton';
import { useDialogs } from '@/hooks/useDialog';
import { ConnectionStatus, PMScanDevice, LocationData } from '@/types/PMScan';
import { useUnifiedData } from '@/components/UnifiedDataProvider';
import { useScopedRecordingContext } from '@/hooks/useScopedRecordingContext';
import { useGroupSettings } from '@/hooks/useGroupSettings';

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
  const { toast } = useToast();
  const unifiedData = useUnifiedData();
  const { selectedLocation, setSelectedLocation, selectedActivity, setSelectedActivity } = useScopedRecordingContext();
  const { isGroupMode, activeGroup } = useGroupSettings();
  const { dialogs, openDialog, closeDialog, getOnOpenChange } = useDialogs({
    frequency: false,
    mission: false,
    connection: false
  });
  
  const [recordingFrequency, setRecordingFrequency] = useState<string>('10s');
  const [missionName, setMissionName] = useState<string>('');
  const [shareData, setShareData] = useState<boolean>(isGroupMode);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  

  // Extract values from unified data
  const { startRecording, stopRecording, isRecording, recordingData, saveMission } = unifiedData;

  // Extract recording start time from recording data
  const recordingStartTime = recordingData.length > 0 ? recordingData[0]?.timestamp : null;

  // Timer effect for recording duration
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRecording && recordingStartTime) {
      interval = setInterval(() => {
        const now = createTimestamp();
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
    if (!unifiedData.isConnected) {
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
    console.log('🚨🛑 === STOP RECORDING BUTTON CLICKED ===');
    console.log('🛑 Stop recording requested, current data:', recordingData.length, 'points');
    console.log('🛑 Recording data sample:', recordingData.slice(0, 2).map(d => ({ pm25: d.pmData.pm25, timestamp: d.timestamp })));
    console.log('🛑 Recording start time:', recordingStartTime);
    console.log('🛑 Is currently recording:', isRecording);
    // Stop recording but keep data for saving
    stopRecording();
    openDialog('mission');
  };

  const confirmStopRecording = async () => {
    let finalMissionName = missionName.trim();

    if (!finalMissionName) {
      const now = createTimestamp();
      finalMissionName = `Mission ${now.toLocaleDateString('fr-FR')} ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    }

    try {
      console.log('🚨💾 === CONFIRM STOP RECORDING CALLED ===');
      console.log('🔄 Saving mission:', finalMissionName, 'with current recording data:', recordingData.length, 'points');
      console.log('🔄 Recording start time available:', !!recordingStartTime);
      console.log('🔄 Data sample before save:', recordingData.slice(0, 1).map(d => ({ pm25: d.pmData.pm25, timestamp: d.timestamp })));
      
      // Save the mission - data will be captured from current state before clearing
      const savedMission = await saveMission(
        finalMissionName,
        undefined, // locationContext
        undefined, // activityContext
        recordingFrequency,
        shareData,
        recordingData, // explicitRecordingData
        isGroupMode && shareData ? activeGroup?.id : undefined // groupId
      );
      
      console.log('✅ Mission saved successfully');
      
      closeDialog('mission');

      toast({
        title: t('history.export'),
        description: `"${finalMissionName}" ${t('history.export')}`,
      });

      setMissionName('');
      setShareData(isGroupMode);
    } catch (error) {
      console.error('❌ Error saving mission:', error);
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
    console.log('🗑️ Mission discarded by user');
    closeDialog('mission');

    setMissionName('');
    setShareData(isGroupMode);

    toast({
      title: t('modals.missionDetails.delete'),
      description: t('modals.missionDetails.discarded'),
    });
  };

  const handleRecordingClick = () => {
    // Prevent double clicks during state transitions
    if (dialogs.mission || dialogs.frequency) {
      return;
    }
    
    if (isRecording) {
      handleStopRecording();
    } else {
      handleStartRecording();
    }
  };

  return (
    <div className={cn('flex items-center gap-4 justify-end', className)}>
      {/* Start text or Chronometer */}
      {!isRecording ? (
        <div className="flex items-center gap-2 bg-card px-3 py-2 rounded-lg border shadow-sm">
          <span className="text-sm font-medium text-muted-foreground">
            Start
          </span>
        </div>
      ) : (
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
            : 'bg-green-500 text-white hover:shadow-2xl hover:bg-green-600'
        )}
        type="button"
      >
        {isRecording ? (
          <Square className="h-6 w-6" />
        ) : (
          <div className="w-3 h-3 bg-background rounded-full" />
        )}
      </button>

      {/* Event Button - positioned next to record button */}
      <EventButton />

      <RecordingFrequencyDialog
        open={dialogs.frequency}
        onOpenChange={getOnOpenChange('frequency')}
        recordingFrequency={recordingFrequency}
        onFrequencyChange={setRecordingFrequency}
        selectedLocation={selectedLocation}
        onLocationChange={setSelectedLocation}
        selectedActivity={selectedActivity}
        onActivityChange={setSelectedActivity}
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
        onContinue={() => {
          closeDialog('connection');
          openDialog('frequency');
        }}
      />
    </div>
  );
}
