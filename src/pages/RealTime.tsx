import { useState, useEffect, useRef, Suspense, lazy, startTransition } from 'react';
import * as logger from '@/utils/logger';
import { AirQualityCards } from '@/components/RealTime/AirQualityCards';

// Import critical hooks immediately for core functionality
import { usePMScanBluetooth } from '@/hooks/usePMScanBluetooth';
import { useRecordingContext } from '@/contexts/RecordingContext';
import { useAlerts } from '@/contexts/AlertContext';
import { useAutoContext } from '@/hooks/useAutoContext';
import { useAutoContextSampling } from '@/hooks/useAutoContextSampling';
import { useWeatherData } from '@/hooks/useWeatherData';
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
  // Render immediately - no artificial delays
  const [showCriticalOnly, setShowCriticalOnly] = useState(false);

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showGraph, setShowGraph] = useState(false);
  const [showFrequencyDialog, setShowFrequencyDialog] = useState(false);
  const [recordingFrequency, setRecordingFrequency] = useState(
    frequencyOptionKeys[0].value
  );
  const [hasShownFrequencyDialog, setHasShownFrequencyDialog] = useState(false);

  const { t } = useTranslation();
  const { toast } = useToast();
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
    latestLocation,
    locationEnabled,
    requestLocationPermission,
  } = useAutoContext(isRecording && !showCriticalOnly); // Only scan when recording and ready
  
  const { weatherData, fetchWeatherData } = useWeatherData();
  
  const { getEventsByMission } = useEvents();
  const [currentEvents, setCurrentEvents] = useState<any[]>([]);
  
  const { updateContextIfNeeded, forceContextUpdate, autoContextEnabled } = useAutoContextSampling({
    recordingFrequency,
    isRecording: isRecording && !showCriticalOnly,
  });
  
  useEffect(() => {
    logger.debug('RealTime: useAutoContext completed successfully');
  }, []);
  const { checkAlerts } = useAlerts();

  // Initialize with current mission context if already recording
  const [selectedLocation, setSelectedLocation] = useState(
    missionContext.location
  );
  const [selectedActivity, setSelectedActivity] = useState(
    missionContext.activity
  );

  // Add data to recording when new data comes in - with deduplication
  const lastDataRef = useRef<{ pm25: number; timestamp: number } | null>(null);

  useEffect(() => {
    if (isRecording && currentData && !showCriticalOnly) {
      // Prevent duplicate data points by checking if this is actually new data
      const currentTimestamp = currentData.timestamp.getTime();
      const isDuplicate =
        lastDataRef.current &&
        lastDataRef.current.pm25 === currentData.pm25 &&
        Math.abs(currentTimestamp - lastDataRef.current.timestamp) < 500; // Less than 500ms apart

      if (!isDuplicate) {
        logger.rateLimitedDebug(
          'realTime.addData',
          5000,
          'Adding data point with location:',
          latestLocation
        );

        // Update context at recording frequency and get the current context
        const handleContextAndDataPoint = async () => {
          // Calculate speed and movement from GPS data
          let speed = 0;
          let isMoving = false;
          
          if (latestLocation) {
            const { updateLocationHistory } = await import('@/utils/speedCalculator');
            const speedData = updateLocationHistory(
              latestLocation.latitude,
              latestLocation.longitude,
              latestLocation.timestamp
            );
            speed = speedData.speed;
            isMoving = speedData.isMoving;
            
            // Calculate speed and movement from GPS data (development logging only)
            if (process.env.NODE_ENV === 'development' && latestLocation) {
              console.log('🏃 Movement detection:', {
                speed: `${speed} km/h`,
                isMoving,
                location: `${latestLocation.latitude}, ${latestLocation.longitude}`
              });
            }
          }
          
          const automaticContext = await updateContextIfNeeded(
            currentData,
            latestLocation || undefined,
            speed,
            isMoving
          );

          // DO NOT override user's manual activity selection
          // Auto context should be separate from manual tags

          addDataPoint(
            currentData,
            latestLocation || undefined,
            { location: selectedLocation, activity: selectedActivity },
            automaticContext
          );
        };

        handleContextAndDataPoint();
        
        lastDataRef.current = {
          pm25: currentData.pm25,
          timestamp: currentTimestamp,
        };
      }
    }
  }, [
    isRecording,
    currentData,
    latestLocation,
    addDataPoint,
    selectedLocation,
    selectedActivity,
    updateContextIfNeeded,
    showCriticalOnly,
  ]);

  // Clear location history when recording starts for fresh speed calculations
  useEffect(() => {
    if (isRecording && !showCriticalOnly) {
      import('@/utils/speedCalculator').then(({ clearLocationHistory }) => {
        clearLocationHistory();
        if (process.env.NODE_ENV === 'development') {
          console.log('🏃 Cleared location history for new recording session');
        }
      });
    }
  }, [isRecording, showCriticalOnly]);

  // Initial autocontext effect - runs only when autocontext is toggled
  useEffect(() => {
    if (!showCriticalOnly && process.env.NODE_ENV === 'development') {
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
  }, [autoContextEnabled, forceContextUpdate, showCriticalOnly]); // Only run when autocontext is toggled

  // Check alerts whenever new data comes in
  useEffect(() => {
    if (currentData && !showCriticalOnly) {
      checkAlerts(currentData.pm1, currentData.pm25, currentData.pm10);
    }
  }, [currentData, checkAlerts, showCriticalOnly]);

  // Fetch weather data when location changes
  useEffect(() => {
    if (latestLocation && !showCriticalOnly) {
      fetchWeatherData(latestLocation);
    }
  }, [latestLocation, fetchWeatherData, showCriticalOnly]);

  // Initialize local state from mission context on mount only
  useEffect(() => {
    if (missionContext.location && !selectedLocation) {
      setSelectedLocation(missionContext.location);
    }
    if (missionContext.activity && !selectedActivity) {
      setSelectedActivity(missionContext.activity);
    }
  }, []); // Empty dependency array - only run on mount

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
    if (currentMissionId && !showCriticalOnly) {
      getEventsByMission(currentMissionId).then(setCurrentEvents);
    } else {
      setCurrentEvents([]);
    }
  }, [currentMissionId, getEventsByMission, showCriticalOnly]);

  // Reset frequency dialog flag when device disconnects
  useEffect(() => {
    if (!isConnected) {
      setHasShownFrequencyDialog(false);
    }
  }, [isConnected]);

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
  if (showCriticalOnly) {
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
      {/* Map/Graph Section - Fast placeholder until recording confirmed */}
      {localStorage.getItem('recording-confirmed') === 'true' ? (
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