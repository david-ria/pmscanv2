import { useState, useEffect, useRef, useCallback } from 'react';
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
import { useSensorCoordinator } from '@/hooks/useSensorCoordinator';
import { useBackgroundRecordingPersistence } from '@/hooks/useBackgroundRecordingPersistence';
import { useRecordingPersistence } from '@/hooks/useRecordingPersistence';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

import { AirQualityCards } from '@/components/RealTime/AirQualityCards';
import { MapPlaceholder } from '@/components/RealTime/MapPlaceholder';
import { RecordingFrequencyDialog } from '@/components/RecordingControls/RecordingFrequencyDialog';
import { frequencyOptionKeys } from '@/lib/recordingConstants';

// Import components directly to avoid lazy loading issues
import { MapGraphToggle } from '@/components/RealTime/MapGraphToggle';
import { LazyContextSelectors } from '@/components/RealTime/LazyContextSelectors';
import { LazyAutoContextDisplay } from '@/components/RealTime/LazyAutoContextDisplay';
import { LazyDataLogger } from '@/components/RealTime/LazyDataLogger';
import { RecordingHeartbeat } from '@/components/RealTime/RecordingHeartbeat';

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

  // Coordinate all sensors for energy optimization  
  const sensorStateChangeCallback = useCallback((sensorName: string, isActive: boolean) => {
    // Only log actual state changes, not repeated activations
    console.log(`🔧 ${sensorName} sensor ${isActive ? 'activated' : 'deactivated'}`);
  }, []);

  const sensorCoordinator = useSensorCoordinator({
    isRecording,
    recordingFrequency,
    onSensorStateChange: sensorStateChangeCallback,
  });

  // Ensure recording persists in background
  useBackgroundRecordingPersistence();
  
  // Enable recording persistence across sessions and navigation
  useRecordingPersistence();

  const { locationEnabled, latestLocation, requestLocationPermission } = useGPS(
    true,
    false,
    recordingFrequency,
    isRecording
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

  const { weatherData, fetchWeatherData } = useWeatherData({
    isRecording,
    recordingFrequency,
    enabled: true,
  });
  const { getEventsByMission } = useEvents();
  const { checkAlerts } = useAlerts();


  // Signal that UI is ready after first render
  useEffect(() => {
    onUiReady();
  }, [onUiReady]);

  // Data collection is now handled by global RecordingDataCollector component
  // This ensures recording continues across page navigation


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

  // Safeguard: also record points when on Real-Time screen
  useEffect(() => {
    if (!isRecording || !currentData) return;

    const selectedLocation = localStorage.getItem('recording-location') || '';
    const selectedActivity = localStorage.getItem('recording-activity') || '';

    // Add immediately; global collector will be rate-limited by recorder
    addDataPoint(
      currentData,
      latestLocation || undefined,
      { location: selectedLocation, activity: selectedActivity }
    );
  }, [isRecording, currentData, latestLocation, addDataPoint]);

  return (
    <div>
      <RecordingHeartbeat />
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

      <LazyContextSelectors
        selectedLocation={selectedLocation}
        onLocationChange={setSelectedLocation}
        selectedActivity={selectedActivity}
        onActivityChange={setSelectedActivity}
        isRecording={isRecording}
      />

      <LazyAutoContextDisplay />

      <LazyDataLogger 
        isRecording={isRecording}
        currentData={currentData}
        currentLocation={latestLocation}
        missionContext={{ location: selectedLocation, activity: selectedActivity }}
      />

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
