import React, { useState, useEffect, useRef, Suspense, lazy, useCallback } from 'react';
import * as logger from '@/utils/logger';
import { mainThreadOptimizer } from '@/lib/mainThreadOptimizer';
import { AirQualityCards } from '@/components/RealTime/AirQualityCards';

// Import critical hooks immediately for core functionality
import { usePMScanBluetooth } from '@/hooks/usePMScanBluetooth';
import { useRecordingContext } from '@/contexts/RecordingContext';
import { useAlerts } from '@/contexts/AlertContext';
import { useAutoContext } from '@/hooks/useAutoContext';
import { useAutoContextSampling } from '@/hooks/useAutoContextSampling';
import { useStorageSettings } from '@/hooks/useStorage';
import { STORAGE_KEYS } from '@/services/storageService';
import { useWeatherData } from '@/hooks/useWeatherData';
import { useGPS } from '@/hooks/useGPS';
import { frequencyOptionKeys } from '@/lib/recordingConstants';
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

interface RealTimeContentProps {
  isOnline: boolean;
  setIsOnline: (value: boolean) => void;
  showGraph: boolean;
  setShowGraph: (value: boolean) => void;
  showFrequencyDialog: boolean;
  setShowFrequencyDialog: (value: boolean) => void;
  recordingFrequency: string;
  setRecordingFrequency: (value: string) => void;
  hasShownFrequencyDialog: boolean;
  setHasShownFrequencyDialog: (value: boolean) => void;
  currentEvents: any[];
  setCurrentEvents: (events: any[]) => void;
  t: (key: string, options?: any) => string;
  toast: (options: any) => void;
}

export const RealTimeContent = React.memo(function RealTimeContent({ 
  isOnline, setIsOnline, showGraph, setShowGraph, showFrequencyDialog, setShowFrequencyDialog,
  recordingFrequency, setRecordingFrequency, hasShownFrequencyDialog, setHasShownFrequencyDialog,
  currentEvents, setCurrentEvents, t, toast 
}: RealTimeContentProps) {
  console.log('[PERF] 🚀 RealTimeContent - LAZY LOADED COMPONENT STARTED!');
  console.log('[PERF] 🔧 RealTimeContent - Starting hooks initialization');
  
  // Initialize core hooks immediately (for Rules of Hooks)
  const { currentData, isConnected, device, error, requestDevice, disconnect } = usePMScanBluetooth();
  const {
    isRecording,
    addDataPoint,
    missionContext,
    recordingData,
    updateMissionContext,
    startRecording,
    currentMissionId,
  } = useRecordingContext();

  // Defer heavy hooks until user actually needs recording functionality
  const shouldInitializeHeavyHooks = isRecording || isConnected;

  const gpsStart = performance.now();
  const { locationEnabled, latestLocation, requestLocationPermission } = useGPS(shouldInitializeHeavyHooks, false, recordingFrequency);
  if (shouldInitializeHeavyHooks) console.log(`[PERF] 🧭 GPS hook took ${performance.now() - gpsStart}ms`);

  const storageStart = performance.now();
  const { settings: autoContextSettings } = useStorageSettings(
    STORAGE_KEYS.AUTO_CONTEXT_SETTINGS,
    { enabled: false }
  );
  if (shouldInitializeHeavyHooks) console.log(`[PERF] 💾 Storage settings hook took ${performance.now() - storageStart}ms`);
  
  const autoContextStart = performance.now();
  const autoContextResult = useAutoContext(shouldInitializeHeavyHooks && isRecording && autoContextSettings.enabled, latestLocation);
  if (shouldInitializeHeavyHooks) console.log(`[PERF] 🤖 Auto context hook took ${performance.now() - autoContextStart}ms`);
  
  const weatherStart = performance.now();
  const { weatherData, fetchWeatherData } = useWeatherData();
  if (shouldInitializeHeavyHooks) console.log(`[PERF] 🌤️ Weather hook took ${performance.now() - weatherStart}ms`);
  
  const eventsStart = performance.now();
  const { getEventsByMission } = useEvents();
  if (shouldInitializeHeavyHooks) console.log(`[PERF] 📝 Events hook took ${performance.now() - eventsStart}ms`);
  
  const samplingStart = performance.now();
  const { updateContextIfNeeded, forceContextUpdate, autoContextEnabled } = useAutoContextSampling({
    recordingFrequency,
    isRecording: shouldInitializeHeavyHooks && isRecording,
  });
  if (shouldInitializeHeavyHooks) console.log(`[PERF] 📊 Context sampling hook took ${performance.now() - samplingStart}ms`);
  
  const alertsStart = performance.now();
  const { checkAlerts } = useAlerts();
  if (shouldInitializeHeavyHooks) console.log(`[PERF] 🚨 Alerts hook took ${performance.now() - alertsStart}ms`);

  // Restore last selected location/activity from localStorage for recording persistence
  const [selectedLocation, setSelectedLocation] = useState(() => {
    const saved = localStorage.getItem('recording-location');
    return saved || missionContext.location || '';
  });
  const [selectedActivity, setSelectedActivity] = useState(() => {
    const saved = localStorage.getItem('recording-activity');
    return saved || missionContext.activity || '';
  });

  // Add data to recording when new data comes in - with deduplication
  const lastDataRef = useRef<{ pm25: number; timestamp: number } | null>(null);

  useEffect(() => {
    if (isRecording && currentData) {
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
  ]);

  // Clear location history when recording starts for fresh speed calculations
  useEffect(() => {
    if (isRecording) {
      import('@/utils/speedCalculator').then(({ clearLocationHistory }) => {
        clearLocationHistory();
        if (process.env.NODE_ENV === 'development') {
          console.log('🏃 Cleared location history for new recording session');
        }
      });
    }
  }, [isRecording]);

  // Initial autocontext effect - runs only when autocontext is toggled
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
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
  }, [autoContextEnabled, forceContextUpdate]); // Only run when autocontext is toggled

  // Check alerts whenever new data comes in
  useEffect(() => {
    if (currentData) {
      checkAlerts(currentData.pm1, currentData.pm25, currentData.pm10);
    }
  }, [currentData, checkAlerts]);

  // Stabilize weather fetching to prevent repeated calls
  const lastLocationRef = useRef<string>('');
  
  // Fetch weather data when location changes - with debouncing
  useEffect(() => {
    if (latestLocation) {
      const locationKey = `${latestLocation.latitude}_${latestLocation.longitude}`;
      
      // Only fetch if location actually changed
      if (lastLocationRef.current !== locationKey) {
        lastLocationRef.current = locationKey;
        
        // Defer weather fetching using main thread optimizer
        mainThreadOptimizer.scheduleTask(
          () => {
            console.log(`[PERF] 🌤️ Triggering weather fetch for location: ${latestLocation.latitude}, ${latestLocation.longitude}`);
            return fetchWeatherData(latestLocation);
          },
          { priority: 'background' }
        );
      }
    }
  }, [latestLocation]); // fetchWeatherData is stable useCallback, no need to include

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
    if (currentMissionId) {
      getEventsByMission(currentMissionId).then(setCurrentEvents);
    } else {
      setCurrentEvents([]);
    }
  }, [currentMissionId, getEventsByMission]);

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

  console.log('[PERF] 🎨 RealTimeContent - Rendering UI');

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
});

export default RealTimeContent;