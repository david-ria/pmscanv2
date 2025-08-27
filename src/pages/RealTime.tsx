import { useState, useEffect, useRef, Suspense, lazy, startTransition } from 'react';
import * as logger from '@/utils/logger';
import { AirQualityCards } from '@/components/RealTime/AirQualityCards';
// RecordingDebugger now loaded in App.tsx to avoid duplication

// Import critical hooks immediately for core functionality
import { useUnifiedData } from '@/components/UnifiedDataProvider';
import { useAlerts } from '@/contexts/AlertContext';
import { useAutoContext } from '@/hooks/useAutoContext';
import { useAutoContextSampling } from '@/hooks/useAutoContextSampling';
import { useStorageSettings } from '@/hooks/useStorage';
import { STORAGE_KEYS } from '@/services/storageService';
import { useWeatherData } from '@/hooks/useWeatherData';
import { useGPS } from '@/hooks/useGPS';

import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { useEvents } from '@/hooks/useEvents';

// Import lightweight placeholder for fast LCP
import { MapPlaceholder } from '@/components/RealTime/MapPlaceholder';
import { FloatingRecordButton } from '@/components/FloatingRecordButton';
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
const DataLogger = lazy(() => 
  import('@/components/DataLogger').then(module => ({ 
    default: module.DataLogger 
  }))
);

export default function RealTime() {
  // Fast LCP - defer heavy initialization
  const [initialized, setInitialized] = useState(false);
  
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showGraph, setShowGraph] = useState(false);
  const [currentEvents, setCurrentEvents] = useState<any[]>([]);

  const { t } = useTranslation();
  const { toast } = useToast();

  // Initialize heavy hooks after first paint using startTransition
  useEffect(() => {
    startTransition(() => {
      setInitialized(true);
    });
  }, []);

  // Get unified data from single source
  const unifiedData = useUnifiedData();
  const {
    currentData,
    isConnected,
    device,
    error,
    requestDevice,
    disconnect,
    isRecording,
    recordingData,
    missionContext,
    startRecording,
    updateMissionContext,
    latestLocation,
    locationEnabled,
  } = unifiedData;

  // Only initialize autocontext if the user has enabled it
  const { settings: autoContextSettings } = useStorageSettings(
    STORAGE_KEYS.AUTO_CONTEXT_SETTINGS,
    { enabled: false }
  );
  const autoContextResult = useAutoContext(isRecording && initialized && autoContextSettings.enabled, latestLocation);
  const { weatherData, fetchWeatherData } = useWeatherData();
  const { getEventsByMission } = useEvents();
  
  const { updateContextIfNeeded, forceContextUpdate, autoContextEnabled } = useAutoContextSampling({
    recordingFrequency: '10s', // Default frequency since FloatingRecordButton handles frequency selection
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

  // Data collection is now handled ENTIRELY by GlobalDataCollector component
  // This ensures recording continues even when navigating away from this page
  // NO data collection logic should remain here to avoid conflicts

  // Location history clearing is now handled by GlobalDataCollector

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

  // Fetch weather data when location changes
  useEffect(() => {
    if (latestLocation && initialized) {
      fetchWeatherData(latestLocation);
    }
  }, [latestLocation, fetchWeatherData, initialized]);

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
      unifiedData.requestLocationPermission?.().catch((err) => {
        console.log('GPS permission request failed:', err);
      });
    }
  }, [locationEnabled, unifiedData.requestLocationPermission]);

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

  // Note: Events functionality temporarily simplified for recording service migration


  // Clear recording-confirmed flag when recording stops
  useEffect(() => {
    if (!isRecording) {
      localStorage.removeItem('recording-confirmed');
    }
  }, [isRecording]);


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
    <main role="main" className="min-h-screen bg-background px-2 sm:px-4 py-4 sm:py-6">
      <h1 className="sr-only">AirSentinels - Real-time Air Quality Monitoring</h1>
      
      {/* Map/Graph Section */}
      <div className="relative">
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
              onRequestLocationPermission={unifiedData.requestLocationPermission}
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
            
            locationEnabled={locationEnabled}
            latestLocation={latestLocation}
          />
        )}

        {/* FloatingRecordButton - Always visible */}
        <FloatingRecordButton
          device={device}
          isConnected={isConnected}
          connectionStatus={{
            connected: isConnected,
            connecting: false,
            error: null,
          }}
          locationEnabled={locationEnabled}
          latestLocation={latestLocation}
          onConnect={requestDevice}
          onDisconnect={disconnect}
          onRequestLocationPermission={unifiedData.requestLocationPermission}
          className="absolute bottom-4 right-4 z-10"
        />
      </div>

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


      {/* Recording Debugger now in App.tsx */}
    </main>
  );
}