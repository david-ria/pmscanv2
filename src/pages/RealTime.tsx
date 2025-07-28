import { useState, useEffect, useRef, Suspense, lazy } from 'react';
import * as logger from '@/utils/logger';
import { AirQualityCards } from '@/components/RealTime/AirQualityCards';

// Import critical hooks immediately for core functionality
import { usePMScanBluetooth } from '@/hooks/usePMScanBluetooth';
import { useRecordingContext } from '@/contexts/RecordingContext';
import { useAlerts } from '@/contexts/AlertContext';
import { useAutoContext } from '@/hooks/useAutoContext';
import { useStorageSettings } from '@/hooks/useStorage';
import { STORAGE_KEYS } from '@/services/storageService';
import { useWeatherData } from '@/hooks/useWeatherData';
import { useGPS } from '@/hooks/useGPS';
import { frequencyOptionKeys } from '@/lib/recordingConstants';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { useEvents } from '@/hooks/useEvents';

// Import lightweight placeholder for fast LCP
import { MapPlaceholder } from '@/components/RealTime/MapPlaceholder';
// Lazy load heavy map component only after frequency selection
const MapGraphToggle = lazy(() => 
  import('@/components/RealTime/MapGraphToggle').then(module => ({ 
    default: module.MapGraphToggle 
  }))
);
const ContextSelectors = lazy(() => 
  import('@/components/RecordingControls/ContextSelectors').then(module => ({ 
    default: module.ContextSelectors 
  }))
);
const AutoContextDisplay = lazy(() => 
  import('@/components/AutoContextDisplay').then(module => ({ 
    default: module.AutoContextDisplay 
  }))
);
const DataLogger = lazy(() => 
  import('@/components/DataLogger').then(module => ({ 
    default: module.DataLogger 
  }))
);
const RecordingFrequencyDialog = lazy(() => 
  import('@/components/RecordingControls/RecordingFrequencyDialog').then(module => ({ 
    default: module.RecordingFrequencyDialog 
  }))
);

export default function RealTime() {
  console.log('[PERF] RealTime component rendering...');
  
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showGraph, setShowGraph] = useState(false);
  const [showFrequencyDialog, setShowFrequencyDialog] = useState(false);
  const [recordingFrequency, setRecordingFrequency] = useState(
    frequencyOptionKeys[0].value
  );
  const [hasShownFrequencyDialog, setHasShownFrequencyDialog] = useState(false);
  const [currentEvents, setCurrentEvents] = useState<any[]>([]);

  const { t } = useTranslation();
  const { toast } = useToast();

  // Initialize hooks normally
  const { currentData, isConnected, device, error, requestDevice, disconnect } =
    usePMScanBluetooth();

  const {
    isRecording,
    addDataPoint,
    missionContext,
    recordingData,
    updateMissionContext,
    startRecording,
    currentMissionId,
  } = useRecordingContext();

  const { 
    locationEnabled, 
    latestLocation, 
    requestLocationPermission 
  } = useGPS(true, false, recordingFrequency);

  // Initialize autocontext if enabled
  const { settings: autoContextSettings } = useStorageSettings(
    STORAGE_KEYS.AUTO_CONTEXT_SETTINGS,
    { enabled: false }
  );
  const autoContextResult = useAutoContext(isRecording && autoContextSettings.enabled, latestLocation);
  const { weatherData, fetchWeatherData } = useWeatherData();
  const { getEventsByMission } = useEvents();
  
  const { checkAlerts } = useAlerts();
  
  // Restore last selected location/activity from localStorage for recording persistence
  const [selectedLocation, setSelectedLocation] = useState(() => {
    const saved = localStorage.getItem('recording-location');
    return saved || (missionContext?.location) || '';
  });
  const [selectedActivity, setSelectedActivity] = useState(() => {
    const saved = localStorage.getItem('recording-activity');
    return saved || (missionContext?.activity) || '';
  });

  // Add data to recording when new data comes in - with deduplication
  const lastDataRef = useRef<{ pm25: number; timestamp: number } | null>(null);

  useEffect(() => {
    if (currentData && isRecording) {
      const currentTimestamp = currentData.timestamp.getTime();
      const lastData = lastDataRef.current;

      // Prevent duplicate data points (same PM2.5 value within 1 second)
      if (
        !lastData ||
        lastData.pm25 !== currentData.pm25 ||
        currentTimestamp - lastData.timestamp > 1000
      ) {
        addDataPoint(currentData, latestLocation, { location: selectedLocation, activity: selectedActivity });

        lastDataRef.current = {
          pm25: currentData.pm25,
          timestamp: currentTimestamp,
        };

        logger.info('Added data point to recording', {
          pm25: currentData.pm25,
          timestamp: currentData.timestamp,
          hasLocation: !!latestLocation,
        });
      }
    }
  }, [currentData, isRecording, addDataPoint, latestLocation, selectedLocation, selectedActivity]);

  // Clear location history when recording starts to ensure fresh data
  useEffect(() => {
    if (isRecording) {
      // Clear the location history for fresh start
      console.log('Recording started - clearing location history');
    }
  }, [isRecording]);

  // Check alerts when data changes
  useEffect(() => {
    if (currentData && isConnected) {
      checkAlerts(currentData.pm1, currentData.pm25, currentData.pm10);
    }
  }, [currentData, isConnected, checkAlerts]);

  // Fetch weather data based on location
  useEffect(() => {
    if (latestLocation && isRecording) {
      fetchWeatherData({ latitude: latestLocation.latitude, longitude: latestLocation.longitude }, new Date());
    }
  }, [latestLocation, isRecording, fetchWeatherData]);

  // Persist user selections to localStorage
  useEffect(() => {
    if (selectedLocation) {
      localStorage.setItem('recording-location', selectedLocation);
    }
  }, [selectedLocation]);

  useEffect(() => {
    if (selectedActivity) {
      localStorage.setItem('recording-activity', selectedActivity);
    }
  }, [selectedActivity]);

  // Request GPS permissions on mount
  useEffect(() => {
    if (!locationEnabled) {
      requestLocationPermission();
    }
  }, [locationEnabled, requestLocationPermission]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch events for current mission
  useEffect(() => {
    if (currentMissionId) {
      getEventsByMission(currentMissionId).then(setCurrentEvents);
    }
  }, [currentMissionId, getEventsByMission]);

  // Recording workflow: Connection -> Frequency selection -> Map display
  useEffect(() => {
    if (isConnected && !hasShownFrequencyDialog && !isRecording) {
      setShowFrequencyDialog(true);
      setHasShownFrequencyDialog(true);
    }
  }, [isConnected, hasShownFrequencyDialog, isRecording]);

  const handleFrequencySelect = (frequency: string) => {
    setRecordingFrequency(frequency);
    setShowFrequencyDialog(false);
  };

  const handleStartRecordingWorkflow = async () => {
    try {
      if (!isConnected) {
        await requestDevice();
        return;
      }

      // Show frequency dialog first if not shown
      if (!hasShownFrequencyDialog) {
        setShowFrequencyDialog(true);
        setHasShownFrequencyDialog(true);
        return;
      }

      // Start recording with current context
      startRecording(recordingFrequency);

      if (process.env.NODE_ENV === 'development') {
        console.log(`🎬 Recording started with frequency: ${recordingFrequency}`);
      }
    } catch (error) {
      logger.error('Failed to start recording:', error);
      toast({
        title: t('notifications.error'),
        description: t('notifications.recordingStartError'),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-background px-2 sm:px-4 py-4 sm:py-6">
      {/* Map/Graph Section - Only show MapGraphToggle when actually recording */}
      {isRecording ? (
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

      {/* Air Quality Cards - Critical for LCP */}
      <AirQualityCards currentData={currentData} isConnected={isConnected} />

      {/* Context Selectors - Lazy loaded */}
      <div className="mb-4 context-selector">
        <Suspense fallback={<div className="h-20 bg-muted/10 rounded animate-pulse" />}>
          <ContextSelectors
            selectedLocation={selectedLocation}
            selectedActivity={selectedActivity}
            onLocationChange={setSelectedLocation}
            onActivityChange={setSelectedActivity}
            isRecording={isRecording}
          />
        </Suspense>
      </div>

      {/* Auto Context Display - Lazy loaded */}
      {autoContextSettings.enabled && (
        <div className="mb-4">
          <Suspense fallback={<div className="h-16 bg-muted/10 rounded animate-pulse" />}>
            <AutoContextDisplay />
          </Suspense>
        </div>
      )}

      {/* Data Logger - Lazy loaded */}
      <div className="mb-4">
        <Suspense fallback={<div className="h-32 bg-muted/10 rounded animate-pulse" />}>
          <DataLogger 
            isRecording={isRecording}
            currentData={currentData}
          />
        </Suspense>
      </div>

      {/* Recording Frequency Dialog - Lazy loaded */}
      <Suspense fallback={null}>
        <RecordingFrequencyDialog
          open={showFrequencyDialog}
          onOpenChange={setShowFrequencyDialog}
          recordingFrequency={recordingFrequency}
          onFrequencyChange={handleFrequencySelect}
          onConfirm={() => setShowFrequencyDialog(false)}
        />
      </Suspense>
    </div>
  );
}