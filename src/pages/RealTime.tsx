
import { useState, useEffect, useRef, Suspense, lazy, startTransition } from 'react';
import * as logger from '@/utils/logger';

// static imports of hooks (no more dynamic import of hooks!)
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

// lazy UI chunks only
const MapGraphToggle = lazy(() =>
  import('@/components/RealTime/MapGraphToggle').then(m => ({ default: m.MapGraphToggle }))
);
const ContextSelectors = lazy(() =>
  import('@/components/RecordingControls/ContextSelectors').then(m => ({ default: m.ContextSelectors }))
);
const AutoContextDisplay = lazy(() =>
  import('@/components/AutoContextDisplay').then(m => ({ default: m.AutoContextDisplay }))
);
const DataLogger = lazy(() =>
  import('@/components/DataLogger').then(m => ({ default: m.DataLogger }))
);
const RecordingFrequencyDialog = lazy(() =>
  import('@/components/RecordingControls/RecordingFrequencyDialog').then(m => ({
    default: m.RecordingFrequencyDialog,
  }))
);

// Add the missing frequencyOptionKeys
const frequencyOptionKeys = [
  { value: 1000, label: '1s' },
  { value: 2000, label: '2s' },
  { value: 5000, label: '5s' },
  { value: 10000, label: '10s' }
];

export default function RealTime() {
  // --- 1) local UI state & flags
  const [initialized, setInitialized] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showGraph, setShowGraph] = useState(false);
  const [showFrequencyDialog, setShowFrequencyDialog] = useState(false);
  const [hasShownFrequencyDialog, setHasShownFrequencyDialog] = useState(false);

  const [recordingFrequency, setRecordingFrequency] = useState(
    frequencyOptionKeys[0].value
  );
  const [selectedLocation, setSelectedLocation] = useState(() => {
    const saved = localStorage.getItem('recording-location');
    return saved || '';
  });
  const [selectedActivity, setSelectedActivity] = useState(() => {
    const saved = localStorage.getItem('recording-activity');
    return saved || '';
  });
  const [currentEvents, setCurrentEvents] = useState<any[]>([]);

  // --- 2) static hook calls (always in same order!)
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

  // GPS hook will use your recordingFrequency state
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
    isRecording && initialized && autoContextSettings.enabled,
    latestLocation
  );

  const {
    updateContextIfNeeded,
    forceContextUpdate,
    autoContextEnabled,
  } = useAutoContextSampling({
    recordingFrequency,
    isRecording: isRecording && initialized,
  });

  const { weatherData, fetchWeatherData } = useWeatherData();
  const { getEventsByMission } = useEvents();
  const { checkAlerts } = useAlerts();

  // dedupe
  const lastDataRef = useRef<{ pm25: number; timestamp: number } | null>(null);

  // --- 3) defer "heavy" init until after first paint
  useEffect(() => {
    startTransition(() => setInitialized(true));
  }, []);

  // --- 4) add data points when new sensor data arrives
  useEffect(() => {
    if (!initialized || !isRecording || !currentData) return;

    const ts = currentData.timestamp.getTime();
    const dup =
      lastDataRef.current?.pm25 === currentData.pm25 &&
      Math.abs(ts - lastDataRef.current.timestamp) < 500;

    if (dup) return;

    (async () => {
      // compute speed/movement
      let speed = 0, isMoving = false;
      if (latestLocation) {
        const { updateLocationHistory } = await import('@/utils/speedCalculator');
        const sp = updateLocationHistory(
          latestLocation.latitude,
          latestLocation.longitude,
          latestLocation.timestamp
        );
        speed = sp.speed;
        isMoving = sp.isMoving;
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
    initialized,
    latestLocation,
    selectedLocation,
    selectedActivity,
    updateContextIfNeeded,
    addDataPoint,
  ]);

  // clear history on new session
  useEffect(() => {
    if (initialized && isRecording) {
      import('@/utils/speedCalculator').then(({ clearLocationHistory }) => {
        clearLocationHistory();
      });
    }
  }, [initialized, isRecording]);

  // force immediate context update when toggling auto‐context
  useEffect(() => {
    if (initialized && autoContextEnabled && currentData) {
      forceContextUpdate(currentData, latestLocation || undefined, 0, false);
    }
  }, [initialized, autoContextEnabled, currentData, latestLocation, forceContextUpdate]);

  // check alerts
  useEffect(() => {
    if (initialized && currentData) {
      checkAlerts(currentData.pm1, currentData.pm25, currentData.pm10);
    }
  }, [initialized, currentData, checkAlerts]);

  // fetch weather
  useEffect(() => {
    if (initialized && latestLocation) {
      fetchWeatherData(latestLocation);
    }
  }, [initialized, latestLocation, fetchWeatherData]);

  // persist selectors
  useEffect(() => {
    localStorage.setItem('recording-location', selectedLocation);
  }, [selectedLocation]);
  useEffect(() => {
    localStorage.setItem('recording-activity', selectedActivity);
  }, [selectedActivity]);

  // GPS permission
  useEffect(() => {
    if (initialized && !locationEnabled) {
      requestLocationPermission().catch(console.error);
    }
  }, [initialized, locationEnabled, requestLocationPermission]);

  // online/offline
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

  // load events
  useEffect(() => {
    if (initialized && currentMissionId) {
      getEventsByMission(currentMissionId).then(setCurrentEvents);
    } else {
      setCurrentEvents([]);
    }
  }, [initialized, currentMissionId, getEventsByMission]);

  // reset frequency dialog on disconnect
  useEffect(() => {
    if (!isConnected) setHasShownFrequencyDialog(false);
  }, [isConnected]);

  // clear flag when stop
  useEffect(() => {
    if (!isRecording) localStorage.removeItem('recording-confirmed');
  }, [isRecording]);

  // recording workflow
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

  // auto-show freq dialog
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

  // --- 5) render
  if (!initialized) {
    return (
      <div className="min-h-screen bg-background px-2 sm:px-4 py-4 sm:py-6">
        <div className="text-center p-8">
          <h1 className="text-2xl font-semibold mb-2">AirSentinels</h1>
          <p className="text-muted-foreground">Chargement des données de qualité de l'air…</p>
          <div className="mt-4 w-8 h-8 bg-primary/20 rounded-full animate-pulse mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-2 sm:px-4 py-4 sm:py-6">
      {(isRecording || localStorage.getItem('recording-confirmed') === 'true') ? (
        <Suspense fallback={<div className="h-64 bg-muted/20 rounded-lg animate-pulse mb-4" />}>
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
        </Suspense>
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
        <Suspense fallback={<div className="h-20 bg-muted/20 rounded-lg animate-pulse" />}>
          <ContextSelectors
            selectedLocation={selectedLocation}
            onLocationChange={setSelectedLocation}
            selectedActivity={selectedActivity}
            onActivityChange={setSelectedActivity}
            isRecording={isRecording}
          />
        </Suspense>
      </div>

      <div className="mb-4 auto-context-display">
        <Suspense fallback={<div className="h-16 bg-muted/20 rounded-lg animate-pulse" />}>
          <AutoContextDisplay />
        </Suspense>
      </div>

      <div className="mb-4 data-logger">
        <Suspense fallback={<div className="h-32 bg-muted/20 rounded-lg animate-pulse" />}>
          <DataLogger />
        </Suspense>
      </div>

      <Suspense fallback={null}>
        <RecordingFrequencyDialog
          open={showFrequencyDialog}
          onOpenChange={setShowFrequencyDialog}
          selectedFrequency={recordingFrequency}
          onFrequencyChange={setRecordingFrequency}
          onConfirm={handleFrequencyConfirm}
          frequencyOptions={frequencyOptionKeys}
        />
      </Suspense>
    </div>
  );
}
