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

// Lazy load heavy components to reduce initial bundle size
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
  const [isPageReady, setIsPageReady] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  
  useEffect(() => {
    logger.debug('RealTime: Component initializing');
    
    // Use startTransition to mark updates as non-urgent
    startTransition(() => {
      setIsPageReady(true);
    });
    
    // Defer hydration of heavy components to improve initial render
    const timer = setTimeout(() => {
      startTransition(() => {
        setIsHydrated(true);
      });
    }, 50); // Reduced from 100ms for better UX
    
    return () => clearTimeout(timer);
  }, []);

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
  } = useAutoContext(isRecording && isPageReady); // Only scan when recording and page is ready
  
  const { weatherData, fetchWeatherData } = useWeatherData();
  
  const { getEventsByMission } = useEvents();
  const [currentEvents, setCurrentEvents] = useState<any[]>([]);
  
  const { updateContextIfNeeded, forceContextUpdate, autoContextEnabled } = useAutoContextSampling({
    recordingFrequency,
    isRecording: isRecording && isPageReady,
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
    if (isRecording && currentData && isPageReady) {
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
            
            console.log('🏃 Movement detection:', {
              speed: `${speed} km/h`,
              isMoving,
              location: `${latestLocation.latitude}, ${latestLocation.longitude}`
            });
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
    isPageReady,
  ]);

  // Clear location history when recording starts for fresh speed calculations
  useEffect(() => {
    if (isRecording && isPageReady) {
      import('@/utils/speedCalculator').then(({ clearLocationHistory }) => {
        clearLocationHistory();
        console.log('🏃 Cleared location history for new recording session');
      });
    }
  }, [isRecording, isPageReady]);

  // Initial autocontext effect - runs only when autocontext is toggled
  useEffect(() => {
    if (isPageReady) {
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
  }, [autoContextEnabled, forceContextUpdate, isPageReady]); // Only run when autocontext is toggled

  // Check alerts whenever new data comes in
  useEffect(() => {
    if (currentData && isPageReady) {
      checkAlerts(currentData.pm1, currentData.pm25, currentData.pm10);
    }
  }, [currentData, checkAlerts, isPageReady]);

  // Fetch weather data when location changes
  useEffect(() => {
    if (latestLocation && isPageReady) {
      fetchWeatherData(latestLocation);
    }
  }, [latestLocation, fetchWeatherData, isPageReady]);

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
    if (currentMissionId && isPageReady) {
      getEventsByMission(currentMissionId).then(setCurrentEvents);
    } else {
      setCurrentEvents([]);
    }
  }, [currentMissionId, getEventsByMission, isPageReady]);

  // Reset frequency dialog flag when device disconnects
  useEffect(() => {
    if (!isConnected) {
      setHasShownFrequencyDialog(false);
    }
  }, [isConnected]);

  // Handle frequency dialog confirmation
  const handleFrequencyConfirm = async () => {
    try {
      setShowFrequencyDialog(false);
      await startRecording(recordingFrequency);

      toast({
        title: t('notifications.recordingStarted'),
        description: t('notifications.recordingStartedDesc', {
          frequency: recordingFrequency,
        }),
      });

      logger.debug(
        `🎬 Recording started with frequency: ${recordingFrequency}`
      );
    } catch (error) {
      logger.error('Failed to start recording:', error);
      toast({
        title: t('notifications.error'),
        description: t('notifications.recordingStartError'),
        variant: 'destructive',
      });
    }
  };

  // Early return with minimal UI if not hydrated - Critical for LCP
  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-background px-2 sm:px-4 py-4 sm:py-6">
        {/* Air Quality Cards - Critical for LCP, show immediately */}
        <AirQualityCards currentData={currentData} isConnected={isConnected} />
        
        {/* Loading placeholders for other components */}
        <div className="h-64 bg-muted/10 rounded-lg animate-pulse mb-4" />
        <div className="h-20 bg-muted/10 rounded-lg animate-pulse mb-4" />
        <div className="h-16 bg-muted/10 rounded-lg animate-pulse mb-4" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-2 sm:px-4 py-4 sm:py-6">
      {/* Map/Graph Toggle Section - Lazy loaded */}
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

      {/* Air Quality Cards - Critical for LCP */}
      <AirQualityCards currentData={currentData} isConnected={isConnected} />

      {/* Context Selectors - Lazy loaded */}
      <div className="mb-4">
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
      <div className="mb-4">
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