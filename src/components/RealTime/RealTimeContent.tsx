import { useState, useEffect, useRef } from 'react';
import * as logger from '@/utils/logger';

// Move all heavy imports here - away from the main RealTime bundle
import { usePMScanBluetooth } from '@/hooks/usePMScanBluetooth';
import { useRecordingContext } from '@/contexts/RecordingContext';
import { useAlerts } from '@/contexts/AlertContext';
import { useAutoContext } from '@/hooks/useAutoContext';
import { useAutoContextSampling } from '@/hooks/useAutoContextSampling';
import { useStorageSettings } from '@/hooks/useStorage';
import { STORAGE_KEYS } from '@/services/storageService';
import { useWeatherData } from '@/hooks/useWeatherData';
import { useGPS } from '@/hooks/useGPS';
import { useEvents } from '@/hooks/useEvents';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

import { AirQualityCards } from '@/components/RealTime/AirQualityCards';
import { MapPlaceholder } from '@/components/RealTime/MapPlaceholder';
import { MapGraphToggle } from '@/components/RealTime/MapGraphToggle';
import { ContextSelectors } from '@/components/RecordingControls/ContextSelectors';
import { AutoContextDisplay } from '@/components/AutoContextDisplay';
import { DataLogger } from '@/components/DataLogger';
import { RecordingFrequencyDialog } from '@/components/RecordingControls/RecordingFrequencyDialog';
import { frequencyOptionKeys } from '@/lib/recordingConstants';

interface RealTimeContentProps {
  onUiReady: () => void;
}

export default function RealTimeContent({ onUiReady }: RealTimeContentProps) {
  // --- 1) local UI state & flags
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showGraph, setShowGraph] = useState(false);
  const [showFrequencyDialog, setShowFrequencyDialog] = useState(false);
  const [hasShownFrequencyDialog, setHasShownFrequencyDialog] = useState(false);
  const [recordingFrequency, setRecordingFrequency] = useState(frequencyOptionKeys[0].value);
  
  const [selectedLocation, setSelectedLocation] = useState(() => {
    const saved = localStorage.getItem('recording-location');
    return saved || '';
  });
  const [selectedActivity, setSelectedActivity] = useState(() => {
    const saved = localStorage.getItem('recording-activity');
    return saved || '';
  });
  const [currentEvents, setCurrentEvents] = useState<any[]>([]);

  // --- 2) heavy hooks (now isolated in this component)
  const { t } = useTranslation();
  const { toast } = useToast();

  const {
    currentData,
    isConnected,
    device,
    error,
    requestDevice,
    disconnect,
  } = usePMScanBluetooth();

  const {
    isRecording,
    addDataPoint,
    missionContext,
    recordingData,
    startRecording,
    updateMissionContext,
    currentMissionId,
  } = useRecordingContext();

  const { locationEnabled, latestLocation, requestLocationPermission } = useGPS(
    true,
    false,
    recordingFrequency
  );

  const { settings: autoContextSettings } = useStorageSettings(
    STORAGE_KEYS.AUTO_CONTEXT_SETTINGS,
    { enabled: false }
  );
  
  const autoContextResult = useAutoContext(
    isRecording && autoContextSettings.enabled,
    latestLocation
  );

  const {
    updateContextIfNeeded,
    forceContextUpdate,
    autoContextEnabled,
  } = useAutoContextSampling({
    recordingFrequency,
    isRecording,
  });

  const { weatherData, fetchWeatherData } = useWeatherData();
  const { getEventsByMission } = useEvents();
  const { checkAlerts } = useAlerts();

  // dedupe
  const lastDataRef = useRef<{ pm25: number; timestamp: number } | null>(null);

  // Signal that UI is ready after first render
  useEffect(() => {
    onUiReady();
  }, [onUiReady]);

  // Heavy computations moved to web worker for better performance
  useEffect(() => {
    if (!isRecording || !currentData) return;

    const ts = currentData.timestamp.getTime();
    const dup =
      lastDataRef.current?.pm25 === currentData.pm25 &&
      Math.abs(ts - lastDataRef.current.timestamp) < 500;

    if (dup) return;

    // Use web worker for speed calculations to avoid blocking main thread
    (async () => {
      let speed = 0, isMoving = false;
      if (latestLocation) {
        try {
          // Import worker manager dynamically to keep it out of main bundle
          const { speedWorkerManager } = await import('@/lib/speedWorkerManager');
          const result = await speedWorkerManager.calculateSpeed(
            latestLocation.latitude,
            latestLocation.longitude,
            latestLocation.timestamp.getTime()
          );
          speed = result.speed;
          isMoving = result.isMoving;
        } catch (error) {
          console.warn('Speed calculation failed, using fallback:', error);
          // Fallback to original calculation if worker fails
          const { updateLocationHistory } = await import('@/utils/speedCalculator');
          const sp = updateLocationHistory(
            latestLocation.latitude,
            latestLocation.longitude,
            latestLocation.timestamp
          );
          speed = sp.speed;
          isMoving = sp.isMoving;
        }
      }

      const automaticContext = await updateContextIfNeeded(
        currentData,
        latestLocation || undefined,
        speed,
        isMoving
      );

      addDataPoint(
        currentData,
        latestLocation || undefined,
        { location: selectedLocation, activity: selectedActivity },
        automaticContext
      );
    })();

    lastDataRef.current = { pm25: currentData.pm25, timestamp: ts };
  }, [
    currentData,
    isRecording,
    latestLocation,
    selectedLocation,
    selectedActivity,
    updateContextIfNeeded,
    addDataPoint,
  ]);

  // Clear worker history when starting new recording
  useEffect(() => {
    if (isRecording) {
      // Clear both worker and fallback history
      import('@/lib/speedWorkerManager').then(({ speedWorkerManager }) => {
        speedWorkerManager.clearHistory();
      });
      import('@/utils/speedCalculator').then(({ clearLocationHistory }) => {
        clearLocationHistory();
      });
    }
  }, [isRecording]);

  useEffect(() => {
    if (autoContextEnabled && currentData) {
      forceContextUpdate(currentData, latestLocation || undefined, 0, false);
    }
  }, [autoContextEnabled, currentData, latestLocation, forceContextUpdate]);

  useEffect(() => {
    if (currentData) {
      checkAlerts(currentData.pm1, currentData.pm25, currentData.pm10);
    }
  }, [currentData, checkAlerts]);

  useEffect(() => {
    if (latestLocation) {
      fetchWeatherData(latestLocation);
    }
  }, [latestLocation, fetchWeatherData]);

  useEffect(() => {
    localStorage.setItem('recording-location', selectedLocation);
  }, [selectedLocation]);
  
  useEffect(() => {
    localStorage.setItem('recording-activity', selectedActivity);
  }, [selectedActivity]);

  useEffect(() => {
    if (!locationEnabled) {
      requestLocationPermission().catch(console.error);
    }
  }, [locationEnabled, requestLocationPermission]);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  useEffect(() => {
    if (currentMissionId) {
      getEventsByMission(currentMissionId).then(setCurrentEvents);
    } else {
      setCurrentEvents([]);
    }
  }, [currentMissionId, getEventsByMission]);

  useEffect(() => {
    if (!isConnected) setHasShownFrequencyDialog(false);
  }, [isConnected]);

  useEffect(() => {
    if (!isRecording) localStorage.removeItem('recording-confirmed');
  }, [isRecording]);

  // Event handlers
  const handleStartRecordingWorkflow = async () => {
    if (!isConnected) {
      try {
        await requestDevice();
      } catch {
        toast({ title: t('notifications.error'), description: 'Failed to connect', variant: 'destructive' });
      }
    } else {
      setShowFrequencyDialog(true);
    }
  };

  useEffect(() => {
    if (isConnected && !hasShownFrequencyDialog && !isRecording) {
      setShowFrequencyDialog(true);
      setHasShownFrequencyDialog(true);
    }
  }, [isConnected, hasShownFrequencyDialog, isRecording]);

  const handleFrequencyConfirm = async () => {
    try {
      setShowFrequencyDialog(false);
      await startRecording(recordingFrequency);
      localStorage.setItem('recording-confirmed', 'true');
      toast({ title: t('notifications.recordingStarted'), description: t('notifications.recordingStartedDesc', { frequency: recordingFrequency }) });
    } catch (err) {
      logger.error(err);
      toast({ title: t('notifications.error'), description: t('notifications.recordingStartError'), variant: 'destructive' });
    }
  };

  const handleFrequencyChange = (frequency: string) => {
    setRecordingFrequency(frequency);
  };

  return (
    <div>
      {(isRecording || localStorage.getItem('recording-confirmed') === 'true') ? (
        <MapGraphToggle
          showGraph={showGraph}
          onToggleView={setShowGraph}
          isOnline={isOnline}
          latestLocation={latestLocation}
          currentData={currentData}
          recordingData={recordingData}
          events={currentEvents}
          isRecording={isRecording}
          device={device}
          isConnected={isConnected}
          onConnect={requestDevice}
          onDisconnect={disconnect}
          onRequestLocationPermission={requestLocationPermission}
          locationEnabled={locationEnabled}
        />
      ) : (
        <MapPlaceholder
          showGraph={showGraph}
          onToggleView={setShowGraph}
          isOnline={isOnline}
          device={device}
          isConnected={isConnected}
          onConnect={requestDevice}
          onDisconnect={disconnect}
          onStartRecording={handleStartRecordingWorkflow}
          locationEnabled={locationEnabled}
          latestLocation={latestLocation}
        />
      )}

      <AirQualityCards currentData={currentData} isConnected={isConnected} />

      <div className="mb-4 context-selector">
        <ContextSelectors
          selectedLocation={selectedLocation}
          onLocationChange={setSelectedLocation}
          selectedActivity={selectedActivity}
          onActivityChange={setSelectedActivity}
          isRecording={isRecording}
        />
      </div>

      <div className="mb-4 auto-context-display">
        <AutoContextDisplay />
      </div>

      <div className="mb-4 data-logger">
        <DataLogger 
          isRecording={isRecording}
          currentData={currentData}
          currentLocation={latestLocation}
          missionContext={{ location: selectedLocation, activity: selectedActivity }}
        />
      </div>

      <RecordingFrequencyDialog
        open={showFrequencyDialog}
        onOpenChange={setShowFrequencyDialog}
        recordingFrequency={recordingFrequency}
        onFrequencyChange={handleFrequencyChange}
        onConfirm={handleFrequencyConfirm}
      />
    </div>
  );
}
