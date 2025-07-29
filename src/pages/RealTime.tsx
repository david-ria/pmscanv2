
import {
  useState,
  useEffect,
  useRef,
  Suspense,
  lazy,
  startTransition,
} from 'react';
import * as logger from '@/utils/logger';
import { AirQualityCards } from '@/components/RealTime/AirQualityCards';
import { MapPlaceholder } from '@/components/RealTime/MapPlaceholder';
import { frequencyOptionKeys } from '@/lib/recordingConstants';

// Critical hooks
import { usePMScanBluetooth } from '@/hooks/usePMScanBluetooth';
import { useRecordingContext } from '@/contexts/RecordingContext';
import { useStorageSettings } from '@/hooks/useStorage';
import { STORAGE_KEYS } from '@/services/storageService';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

// Lazy-loaded
const MapGraphToggle = lazy(() =>
  import('@/components/RealTime/MapGraphToggle').then(m => ({
    default: m.MapGraphToggle,
  }))
);
const ContextSelectors = lazy(() =>
  import('@/components/RecordingControls/ContextSelectors').then(m => ({
    default: m.ContextSelectors,
  }))
);
const AutoContextDisplay = lazy(() =>
  import('@/components/AutoContextDisplay').then(m => ({
    default: m.AutoContextDisplay,
  }))
);
const DataLogger = lazy(() =>
  import('@/components/DataLogger').then(m => ({ default: m.DataLogger }))
);
const RecordingFrequencyDialog = lazy(() =>
  import('@/components/RecordingControls/RecordingFrequencyDialog').then(m => ({
    default: m.RecordingFrequencyDialog,
  }))
);

export default function RealTime() {
  // —————————————————————————————————————————————
  // 1) One-time initialization guard
  const hasInitialized = useRef(false);
  const [initialized, setInitialized] = useState(false);

  // Only run once, after first paint
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    // Defer heavy init off the critical path
    startTransition(() => setInitialized(true));
  }, []);

  // —————————————————————————————————————————————
  // 2) Core state & contexts
  const { t } = useTranslation();
  const { toast } = useToast();

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showGraph, setShowGraph] = useState(false);
  const [showFrequencyDialog, setShowFrequencyDialog] = useState(false);
  const [recordingFrequency, setRecordingFrequency] = useState(
    frequencyOptionKeys[0].value
  );
  const [hasShownFreqDialog, setHasShownFreqDialog] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(() => {
    return (
      localStorage.getItem('recording-location') ||
      '' /* fallback from context later */
    );
  });
  const [selectedActivity, setSelectedActivity] = useState(() => {
    return localStorage.getItem('recording-activity') || '';
  });

  const { currentData, isConnected, device, requestDevice, disconnect } =
    usePMScanBluetooth();
  const {
    isRecording,
    addDataPoint,
    missionContext,
    recordingData,
    startRecording,
    currentMissionId,
  } = useRecordingContext();
  const { settings: autoCtxSettings } = useStorageSettings(
    STORAGE_KEYS.AUTO_CONTEXT_SETTINGS,
    { enabled: false }
  );

  // — defer non-critical hooks until initialized
  const [gps, setGps] = useState<{ locationEnabled: boolean; latestLocation: any; requestLocationPermission: () => Promise<boolean> } | null>(null);
  const [autoContext, setAutoContext] = useState<any>(null);
  const [weatherData, setWeatherData] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [alertsChecker, setAlertsChecker] = useState<Function>(() => () => {});

  useEffect(() => {
    if (!initialized) return;

    // use requestIdleCallback for non-urgent setup
    window.requestIdleCallback(async () => {
      const [
        gpsHook,
        { updateContextIfNeeded, autoContextEnabled, forceContextUpdate },
        { fetchWeatherData },
        { getEventsByMission },
        { checkAlerts },
      ] = await Promise.all([
        import('@/hooks/useGPS').then(m => m.useGPS(true, false, recordingFrequency)),
        import('@/hooks/useAutoContextSampling').then(m =>
          m.useAutoContextSampling({
            recordingFrequency,
            isRecording,
          })
        ),
        import('@/hooks/useWeatherData').then(m => m.useWeatherData()),
        import('@/hooks/useEvents').then(m => m.useEvents()),
        import('@/contexts/AlertContext').then(m => m.useAlerts()),
      ]);

      setGps(gpsHook);

      setAutoContext({ updateContextIfNeeded, autoContextEnabled, forceContextUpdate });
      setWeatherData({ fetchWeatherData });
      setEvents([]); // placeholder, we'll fetch below
      setAlertsChecker(() => checkAlerts);

      // immediately request GPS
      if (!gpsHook.locationEnabled) {
        gpsHook.requestLocationPermission().catch(console.warn);
      }
    });
  }, [initialized, recordingFrequency, isRecording]);

  // —————————————————————————————————————————————
  // 3) Data ingestion effect
  const lastRef = useRef<{ pm25: number; ts: number } | null>(null);
  useEffect(() => {
    if (
      initialized &&
      isRecording &&
      currentData &&
      gps?.latestLocation &&
      autoContext
    ) {
      const ts = currentData.timestamp.getTime();
      if (
        !lastRef.current ||
        lastRef.current.pm25 !== currentData.pm25 ||
        ts - lastRef.current.ts > 500
      ) {
        lastRef.current = { pm25: currentData.pm25, ts };
        logger.rateLimitedDebug('realTime.addData', 5000, 'Adding…');

        (async () => {
          const { speed, isMoving } = await import('@/utils/speedCalculator').then(
            ({ updateLocationHistory }) =>
              updateLocationHistory(
                gps.latestLocation.latitude,
                gps.latestLocation.longitude,
                gps.latestLocation.timestamp
              )
          );

          const autoCtx = await autoContext.updateContextIfNeeded(
            currentData,
            gps.latestLocation,
            speed,
            isMoving
          );

          addDataPoint(
            currentData,
            gps.latestLocation,
            { location: selectedLocation, activity: selectedActivity },
            autoCtx
          );
        })();
      }
    }
  }, [
    initialized,
    isRecording,
    currentData,
    gps?.latestLocation,
    autoContext,
    addDataPoint,
    selectedLocation,
    selectedActivity,
  ]);

  // —————————————————————————————————————————————
  // 4) Side effects: weather, alerts, events & persistence
  useEffect(() => {
    if (initialized && gps?.latestLocation && weatherData) {
      weatherData.fetchWeatherData(gps.latestLocation);
    }
  }, [initialized, gps?.latestLocation, weatherData]);

  useEffect(() => {
    if (initialized && currentData) {
      alertsChecker(currentData.pm1, currentData.pm25, currentData.pm10);
    }
  }, [initialized, currentData, alertsChecker]);

  useEffect(() => {
    if (initialized && currentMissionId) {
      import('@/hooks/useEvents')
        .then(m => m.useEvents().getEventsByMission(currentMissionId))
        .then(setEvents);
    }
  }, [initialized, currentMissionId]);

  useEffect(() => {
    if (selectedLocation)
      localStorage.setItem('recording-location', selectedLocation);
  }, [selectedLocation]);

  useEffect(() => {
    if (selectedActivity)
      localStorage.setItem('recording-activity', selectedActivity);
  }, [selectedActivity]);

  // —————————————————————————————————————————————
  // 5) Connectivity & recording workflow
  useEffect(() => {
    const onOnline = () => setIsOnline(true),
      onOffline = () => setIsOnline(false);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Show frequency dialog once after BT connect
  useEffect(() => {
    if (initialized && isConnected && !hasShownFreqDialog && !isRecording) {
      setShowFrequencyDialog(true);
      setHasShownFreqDialog(true);
    }
  }, [initialized, isConnected, isRecording, hasShownFreqDialog]);

  const toastError = (msg: string) =>
    toast({ title: t('notifications.error'), description: msg, variant: 'destructive' });

  const handleStartWorkflow = async () => {
    if (!isConnected) {
      try {
        await requestDevice();
      } catch {
        toastError('Failed to connect to PMScan device');
      }
    } else {
      setShowFrequencyDialog(true);
    }
  };

  const handleFreqConfirm = async () => {
    try {
      setShowFrequencyDialog(false);
      await startRecording(recordingFrequency);
      localStorage.setItem('recording-confirmed', 'true');
      toast({ title: t('notifications.recordingStarted') });
    } catch (err) {
      logger.error('startRecording failed', err);
      toastError(t('notifications.recordingStartError'));
    }
  };

  // —————————————————————————————————————————————
  // 6) Render
  if (!initialized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-2xl font-semibold">AirSentinels</h1>
        <p>Loading…</p>
        <div className="w-8 h-8 mt-4 bg-primary/20 rounded-full animate-pulse" />
      </div>
    );
  }

  const recordingConfirmed = localStorage.getItem('recording-confirmed') === 'true';

  return (
    <div className="min-h-screen px-4 py-6 space-y-4">
      {isRecording || recordingConfirmed ? (
        <Suspense fallback={<MapPlaceholder 
          showGraph={showGraph}
          onToggleView={setShowGraph}
          isOnline={isOnline}
          device={device}
          isConnected={isConnected}
          onConnect={requestDevice}
          onDisconnect={disconnect}
          onStartRecording={handleStartWorkflow}
          locationEnabled={gps?.locationEnabled || false}
          latestLocation={gps?.latestLocation}
        />}>
          <MapGraphToggle
            showGraph={showGraph}
            onToggleView={setShowGraph}
            isOnline={isOnline}
            latestLocation={gps?.latestLocation}
            currentData={currentData}
            recordingData={recordingData}
            events={events}
            isRecording={isRecording}
            device={device}
            isConnected={isConnected}
            onConnect={requestDevice}
            onDisconnect={disconnect}
            onRequestLocationPermission={gps?.requestLocationPermission || (() => Promise.resolve(false))}
            locationEnabled={gps?.locationEnabled || false}
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
          onStartRecording={handleStartWorkflow}
          locationEnabled={gps?.locationEnabled || false}
          latestLocation={gps?.latestLocation}
        />
      )}

      <AirQualityCards currentData={currentData} isConnected={isConnected} />

      <Suspense fallback={<div className="h-20 animate-pulse bg-muted/20 rounded" />}>
        <ContextSelectors
          selectedLocation={selectedLocation}
          onLocationChange={setSelectedLocation}
          selectedActivity={selectedActivity}
          onActivityChange={setSelectedActivity}
          isRecording={isRecording}
        />
      </Suspense>

      <Suspense fallback={<div className="h-16 animate-pulse bg-muted/20 rounded" />}>
        <AutoContextDisplay />
      </Suspense>

      <Suspense fallback={<div className="h-32 animate-pulse bg-muted/20 rounded" />}>
        <DataLogger
          isRecording={isRecording}
          currentData={currentData}
          currentLocation={gps?.latestLocation}
          missionContext={{ location: selectedLocation, activity: selectedActivity }}
        />
      </Suspense>

      <Suspense fallback={null}>
        <RecordingFrequencyDialog
          open={showFrequencyDialog}
          onOpenChange={setShowFrequencyDialog}
          recordingFrequency={recordingFrequency}
          onFrequencyChange={setRecordingFrequency}
          onConfirm={handleFreqConfirm}
        />
      </Suspense>
    </div>
  );
}
