import { useState, useEffect, useRef, Suspense, lazy, startTransition } from 'react';
import * as logger from '@/utils/logger';
import { AirQualityCards } from '@/components/RealTime/AirQualityCards';
import { throttledLog } from '@/utils/debugLogger';

// Import critical hooks immediately for core functionality
import { usePMScanBluetooth } from '@/hooks/usePMScanBluetooth';
import { useRecordingContext } from '@/contexts/RecordingContext';
import { useDirectRecordingData } from '@/hooks/useDirectRecordingData';
import { useAlerts } from '@/contexts/AlertContext';
import { useAutoContext } from '@/hooks/useAutoContext';
import { useAutoContextSampling } from '@/hooks/useAutoContextSampling';
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
  // console.log('🏠 RealTime component starting...'); // Commented out to reduce log spam
  // Fast LCP - defer heavy initialization
  const [initialized, setInitialized] = useState(false);
  
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

  // Initialize heavy hooks after first paint using startTransition
  useEffect(() => {
    startTransition(() => {
      setInitialized(true);
    });
  }, []);

  // Only initialize heavy hooks after critical render
  const { currentData, isConnected, device, error, requestDevice, disconnect } =
    usePMScanBluetooth();

  const {
    isRecording,
    addDataPoint,
    missionContext,
    updateMissionContext,
    startRecording,
    currentMissionId,
  } = useRecordingContext();

  // Use direct polling for real-time data updates, matching the recording frequency
  const { recordingData, dataCount } = useDirectRecordingData(isRecording, recordingFrequency);

  const { 
    locationEnabled, 
    latestLocation, 
    requestLocationPermission 
  } = useGPS(true, false, recordingFrequency);

  // Initialize native recording service
  useEffect(() => {
    import('@/services/nativeRecordingService').then(({ nativeRecordingService, updateGlobalPMScanData }) => {
      // Make sure PMScan data is globally available for native service
      if (currentData) {
        updateGlobalPMScanData(currentData);
        console.log('🔄 Updating global PMScan data with PM2.5:', currentData.pm25);
      }
    });
  }, [currentData]);

  // Optimized effect to monitor recording data changes
  useEffect(() => {
    if (recordingData && recordingData.length > 0) {
      const latest = recordingData[recordingData.length - 1];
      throttledLog('realtime-data-update', `📊 RealTime: ${dataCount} points, latest PM2.5: ${latest?.pmData?.pm25}`);
    }
  }, [dataCount]); // Only trigger on count change, not full data array

  // Only initialize autocontext if the user has enabled it
  const { settings: autoContextSettings } = useStorageSettings(
    STORAGE_KEYS.AUTO_CONTEXT_SETTINGS,
    { enabled: false }
  );
  const autoContextResult = useAutoContext(isRecording && initialized && autoContextSettings.enabled, latestLocation);
  const { weatherData, fetchWeatherData } = useWeatherData();
  const { getEventsByMission } = useEvents();
  
  const { updateContextIfNeeded, forceContextUpdate, autoContextEnabled } = useAutoContextSampling({
    recordingFrequency,
    isRecording: isRecording && initialized,
  });
  
  const { checkAlerts } = useAlerts();

  // Restore last selected location/activity from localStorage for recording persistence
  const [selectedLocation, setSelectedLocation] = useState(() => {
    const saved = localStorage.getItem('recording-location');
    return saved || missionContext.location || '';
  });
  const [selectedActivity, setSelectedActivity] = useState(() => {
    const saved = localStorage.getItem('recording-activity');
    return saved || missionContext.activity || '';
  });

  // Update global PMScan data for native service and sync context
  useEffect(() => {
    if (currentData && initialized) {
      // Make current data globally available for native recording service
      import('@/services/nativeRecordingService').then(({ updateGlobalPMScanData, nativeRecordingService }) => {
        updateGlobalPMScanData(currentData);
        
        // Update mission context in native service when user changes selections
        nativeRecordingService.updateMissionContext(selectedLocation, selectedActivity);
      });
    }
  }, [currentData, selectedLocation, selectedActivity, initialized]);

  // Clear location history when recording starts for fresh speed calculations
  useEffect(() => {
    if (isRecording && initialized) {
      import('@/utils/speedCalculator').then(({ clearLocationHistory }) => {
        clearLocationHistory();
        if (process.env.NODE_ENV === 'development') {
          console.log('🏃 Cleared location history for new recording session');
        }
      });
    }
  }, [isRecording, initialized]);

  // Initial autocontext effect - runs only when autocontext is toggled
  useEffect(() => {
    if (initialized && process.env.NODE_ENV === 'development') {
      console.log('Autocontext effect triggered:', { 
        autoContextEnabled, 
        hasCurrentData: !!currentData, 
        latestLocation 
      });
      
      if (autoContextEnabled && currentData) {
        // Force an immediate context update when autocontext is enabled
        forceContextUpdate(
          currentData,
          latestLocation || undefined,
          0,
          false
        );
      }
    }
  }, [autoContextEnabled, forceContextUpdate, initialized]); // Only run when autocontext is toggled

  // Check alerts whenever new data comes in
  useEffect(() => {
    if (currentData && initialized) {
      checkAlerts(currentData.pm1, currentData.pm25, currentData.pm10);
    }
  }, [currentData, checkAlerts, initialized]);

  // Weather fetching temporarily disabled to prevent CORS spam
  // useEffect(() => {
  //   if (!latestLocation || !initialized) return;
  //   
  //   // Debounce weather fetching to prevent rapid requests
  //   const timeoutId = setTimeout(() => {
  //     fetchWeatherData(latestLocation).catch(error => {
  //       // Silently handle CORS and other fetch errors to prevent spam
  //       console.warn('Weather fetch failed (silently handled):', error.message);
  //     });
  //   }, 2000); // 2 second debounce
  //   
  //   return () => clearTimeout(timeoutId);
  // }, [latestLocation?.latitude, latestLocation?.longitude, initialized]); // Only depend on location coordinates

  // Persist location/activity selections to localStorage for recording persistence
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

  // Request GPS permission when app loads
  useEffect(() => {
    if (!locationEnabled) {
      requestLocationPermission().catch((err) => {
        console.log('GPS permission request failed:', err);
      });
    }
  }, [locationEnabled, requestLocationPermission]);

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

  // Fetch events for the current mission
  useEffect(() => {
    if (currentMissionId && initialized) {
      getEventsByMission(currentMissionId).then(setCurrentEvents);
    } else {
      setCurrentEvents([]);
    }
  }, [currentMissionId, getEventsByMission, initialized]);

  // Reset frequency dialog flag when device disconnects
  useEffect(() => {
    if (!isConnected) {
      setHasShownFrequencyDialog(false);
    }
  }, [isConnected]);

  // Clear recording-confirmed flag when recording stops
  useEffect(() => {
    if (!isRecording) {
      localStorage.removeItem('recording-confirmed');
    }
  }, [isRecording]);

  // Handle the complete recording workflow: BT → Frequency → Map
  const handleStartRecordingWorkflow = async () => {
    // Step 1: First ensure BT device is connected
    if (!isConnected) {
      try {
        await requestDevice(); // This will open BT device selection
        // After connection, the frequency dialog will show automatically via useEffect
      } catch (error) {
        toast({
          title: t('notifications.error'),
          description: 'Failed to connect to PMScan device',
          variant: 'destructive',
        });
      }
    } else {
      // If already connected, show frequency dialog directly
      setShowFrequencyDialog(true);
    }
  };

  // Show frequency dialog automatically after BT connection
  useEffect(() => {
    if (isConnected && !hasShownFrequencyDialog && !isRecording) {
      setShowFrequencyDialog(true);
      setHasShownFrequencyDialog(true);
    }
  }, [isConnected, hasShownFrequencyDialog, isRecording]);

  // Handle frequency dialog confirmation - this is when recording truly starts
  const handleFrequencyConfirm = async () => {
    try {
      setShowFrequencyDialog(false);
      
      // Start recording with selected frequency
      await startRecording(recordingFrequency);
      
      // Set flag that recording has been confirmed (this will trigger map loading)
      localStorage.setItem('recording-confirmed', 'true');

      toast({
        title: t('notifications.recordingStarted'),
        description: t('notifications.recordingStartedDesc', {
          frequency: recordingFrequency,
        }),
      });

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

  // Critical path: Show only essential content first
  if (!initialized) {
    return (
      <div className="min-h-screen bg-background px-2 sm:px-4 py-4 sm:py-6">
        {/* Critical content only - fastest LCP */}
        <div className="text-center p-8">
          <h1 className="text-2xl font-semibold mb-2">AirSentinels</h1>
          <p className="text-muted-foreground">Chargement des données de qualité de l'air...</p>
          <div className="mt-4 w-8 h-8 bg-primary/20 rounded-full animate-pulse mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-2 sm:px-4 py-4 sm:py-6">
      {/* Map/Graph Section - Show MapGraphToggle when recording is active */}
      {isRecording || localStorage.getItem('recording-confirmed') === 'true' ? (
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

      {/* Auto Context Display - Lazy loaded */}
      <div className="mb-4 auto-context-display">
        <Suspense fallback={<div className="h-16 bg-muted/20 rounded-lg animate-pulse" />}>
          <AutoContextDisplay />
        </Suspense>
      </div>

      {/* Data Logger - Lazy loaded */}
      <Suspense fallback={<div className="h-32 bg-muted/20 rounded-lg animate-pulse mb-4" />}>
        <DataLogger
          isRecording={isRecording}
          currentData={currentData}
          currentLocation={latestLocation}
          missionContext={{
            location: selectedLocation,
            activity: selectedActivity,
          }}
          className="mb-4"
        />
      </Suspense>

      {/* Recording Frequency Dialog - Lazy loaded */}
      <Suspense fallback={null}>
        <RecordingFrequencyDialog
          open={showFrequencyDialog}
          onOpenChange={setShowFrequencyDialog}
          recordingFrequency={recordingFrequency}
          onFrequencyChange={setRecordingFrequency}
          onConfirm={handleFrequencyConfirm}
        />
      </Suspense>
    </div>
  );
}