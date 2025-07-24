import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as logger from '@/utils/logger';
import { AirQualityCards } from '@/components/RealTime/AirQualityCards';
import { MapGraphToggle } from '@/components/RealTime/MapGraphToggle';
import { ContextSelectors } from '@/components/RecordingControls/ContextSelectors';
import { AutoContextDisplay } from '@/components/AutoContextDisplay';
import { DataLogger } from '@/components/DataLogger';
import { WeatherCard } from '@/components/WeatherCard';
import { RecordingFrequencyDialog } from '@/components/RecordingControls/RecordingFrequencyDialog';
import { RecordingButton } from '@/components/RecordingControls/RecordingButton';

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

export default function RealTime() {
  useEffect(() => {
    logger.debug('RealTime: Component initializing');
    logger.debug('RealTime: About to call useAutoContext');
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
  } = useAutoContext(isRecording); // Only scan when recording
  
  const { weatherData, fetchWeatherData } = useWeatherData();
  
  const { getEventsByMission } = useEvents();
  const [currentEvents, setCurrentEvents] = useState<any[]>([]);
  
  const { updateContextIfNeeded, forceContextUpdate, autoContextEnabled } = useAutoContextSampling({
    recordingFrequency,
    isRecording,
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

  // Memoize the context handler to prevent unnecessary re-creation
  const handleContextAndDataPoint = useCallback(async (data: typeof currentData, location: typeof latestLocation) => {
    if (!data) return;
    
    // Calculate speed and movement from GPS data
    let speed = 0;
    let isMoving = false;
    
    if (location) {
      const { updateLocationHistory } = await import('@/utils/speedCalculator');
      const speedData = updateLocationHistory(
        location.latitude,
        location.longitude,
        location.timestamp
      );
      speed = speedData.speed;
      isMoving = speedData.isMoving;
      
      // Use rate-limited logging to reduce console spam
      logger.rateLimitedDebug('movement', 2000, '🏃 Movement detection:', {
        speed: `${speed} km/h`,
        isMoving,
        location: `${location.latitude}, ${location.longitude}`
      });
    }
    
    const automaticContext = await updateContextIfNeeded(
      data,
      location || undefined,
      speed,
      isMoving
    );

    addDataPoint(
      data,
      location || undefined,
      { location: selectedLocation, activity: selectedActivity },
      automaticContext
    );
  }, [updateContextIfNeeded, addDataPoint, selectedLocation, selectedActivity]);

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

        handleContextAndDataPoint(currentData, latestLocation);
        
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
    handleContextAndDataPoint,
  ]);

  // Clear location history when recording starts for fresh speed calculations
  useEffect(() => {
    if (isRecording) {
      import('@/utils/speedCalculator').then(({ clearLocationHistory }) => {
        clearLocationHistory();
        console.log('🏃 Cleared location history for new recording session');
      });
    }
  }, [isRecording]);

  // Initial autocontext effect - runs only when autocontext is toggled
  useEffect(() => {
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
  }, [autoContextEnabled, forceContextUpdate]); // Only run when autocontext is toggled

  // Throttle alert checking to reduce CPU usage
  const throttledCheckAlerts = useCallback(
    (pm1: number, pm25: number, pm10: number) => {
      // Only check alerts if values changed significantly (>1 μg/m³)
      const lastCheck = lastDataRef.current;
      if (lastCheck && 
          Math.abs(pm25 - lastCheck.pm25) < 1) {
        return; // Skip if change is minimal
      }
      checkAlerts(pm1, pm25, pm10);
    },
    [checkAlerts]
  );

  // Check alerts whenever new data comes in (throttled)
  useEffect(() => {
    if (currentData) {
      throttledCheckAlerts(currentData.pm1, currentData.pm25, currentData.pm10);
    }
  }, [currentData, throttledCheckAlerts]);

  // Fetch weather data when location changes
  useEffect(() => {
    if (latestLocation) {
      fetchWeatherData(latestLocation);
    }
  }, [latestLocation, fetchWeatherData]);

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

  // Handle frequency dialog confirmation
  const handleFrequencyConfirm = useCallback(async () => {
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
  }, [recordingFrequency, startRecording, toast, t]);

  // Memoize mission context object to prevent unnecessary re-renders
  const memoizedMissionContext = useMemo(() => ({
    location: selectedLocation,
    activity: selectedActivity,
  }), [selectedLocation, selectedActivity]);

  return (
    <div className="min-h-screen bg-background px-2 sm:px-4 py-4 sm:py-6">
      {/* Map/Graph Toggle Section */}
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

      {/* Air Quality Cards */}
      <AirQualityCards currentData={currentData} isConnected={isConnected} />


      {/* Context Selectors */}
      <div className="mb-4">
        <ContextSelectors
          selectedLocation={selectedLocation}
          onLocationChange={setSelectedLocation}
          selectedActivity={selectedActivity}
          onActivityChange={setSelectedActivity}
          isRecording={isRecording}
        />
      </div>

      {/* Auto Context Display - separate from manual tags */}
      <div className="mb-4">
        <AutoContextDisplay />
      </div>

      {/* Data Logger */}
      <DataLogger
        isRecording={isRecording}
        currentData={currentData}
        currentLocation={latestLocation}
        missionContext={memoizedMissionContext}
        className="mb-4"
      />

      {/* Auto-triggered Recording Frequency Dialog */}
      <RecordingFrequencyDialog
        open={showFrequencyDialog}
        onOpenChange={setShowFrequencyDialog}
        recordingFrequency={recordingFrequency}
        onFrequencyChange={setRecordingFrequency}
        onConfirm={handleFrequencyConfirm}
      />
    </div>
  );
}
