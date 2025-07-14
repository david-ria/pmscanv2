import { useState, useEffect, useRef } from 'react';
import * as logger from '@/utils/logger';
import { AirQualityCards } from '@/components/RealTime/AirQualityCards';
import { MapGraphToggle } from '@/components/RealTime/MapGraphToggle';
import { ContextSelectors } from '@/components/RecordingControls/ContextSelectors';
import { DataLogger } from '@/components/DataLogger';
import { RecordingFrequencyDialog } from '@/components/RecordingControls/RecordingFrequencyDialog';

import { usePMScanBluetooth } from '@/hooks/usePMScanBluetooth';
import { useRecordingContext } from '@/contexts/RecordingContext';
import { useAlerts } from '@/contexts/AlertContext';
import { useAutoContext } from '@/hooks/useAutoContext';
import { frequencyOptionKeys } from '@/lib/recordingConstants';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export default function RealTime() {
  console.log('RealTime: Component initializing');
  
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showGraph, setShowGraph] = useState(false);
  const [showFrequencyDialog, setShowFrequencyDialog] = useState(false);
  const [recordingFrequency, setRecordingFrequency] = useState(frequencyOptionKeys[0].value);
  const [hasShownFrequencyDialog, setHasShownFrequencyDialog] = useState(false);

  const { t } = useTranslation();
  const { toast } = useToast();
  const { currentData, isConnected, device, error, requestDevice, disconnect } =
    usePMScanBluetooth();
    
  console.log('RealTime: About to call useAutoContext');
  const {
    determineContext,
    isEnabled: autoContextEnabled,
    latestLocation,
    locationEnabled,
    requestLocationPermission,
  } = useAutoContext();
  console.log('RealTime: useAutoContext completed successfully');
  const {
    isRecording,
    addDataPoint,
    missionContext,
    recordingData,
    updateMissionContext,
    startRecording,
  } = useRecordingContext();
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
    if (isRecording && currentData) {
      // Prevent duplicate data points by checking if this is actually new data
      const currentTimestamp = currentData.timestamp.getTime();
      const isDuplicate =
        lastDataRef.current &&
        lastDataRef.current.pm25 === currentData.pm25 &&
        Math.abs(currentTimestamp - lastDataRef.current.timestamp) < 500; // Less than 500ms apart

      if (!isDuplicate) {
        logger.debug('Adding data point with location:', latestLocation);

        // Determine automatic context if enabled
        const automaticContext = autoContextEnabled
          ? determineContext({
              pmData: currentData,
              location: latestLocation || undefined,
              speed: 0, // Would need to calculate from GPS data
              isMoving: false, // Would need to determine from sensors
            })
          : '';

        addDataPoint(
          currentData,
          latestLocation || undefined,
          missionContext,
          automaticContext
        );
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
    missionContext,
    determineContext,
    autoContextEnabled,
  ]);

  // Check alerts whenever new data comes in
  useEffect(() => {
    if (currentData) {
      checkAlerts(currentData.pm1, currentData.pm25, currentData.pm10);
    }
  }, [currentData, checkAlerts]);

  // Update mission context when location or activity changes
  useEffect(() => {
    updateMissionContext(selectedLocation, selectedActivity);
  }, [selectedLocation, selectedActivity, updateMissionContext]);

  // Keep local state in sync with mission context
  useEffect(() => {
    if (missionContext.location !== selectedLocation) {
      setSelectedLocation(missionContext.location);
    }
  }, [missionContext.location]);

  useEffect(() => {
    if (missionContext.activity !== selectedActivity) {
      setSelectedActivity(missionContext.activity);
    }
  }, [missionContext.activity]);

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

  // Auto-open frequency dialog when device connects for the first time
  useEffect(() => {
    if (isConnected && !isRecording && !hasShownFrequencyDialog) {
      setShowFrequencyDialog(true);
      setHasShownFrequencyDialog(true);
      logger.debug('🎯 Auto-opening frequency dialog after device connection');
    }
  }, [isConnected, isRecording, hasShownFrequencyDialog]);

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
        description: t('notifications.recordingStartedDesc', { frequency: recordingFrequency }),
      });
      
      logger.debug(`🎬 Recording started with frequency: ${recordingFrequency}`);
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

      {/* Map/Graph Toggle Section */}
      <MapGraphToggle
        showGraph={showGraph}
        onToggleView={setShowGraph}
        isOnline={isOnline}
        latestLocation={latestLocation}
        currentData={currentData}
        recordingData={recordingData}
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

      {/* Data Logger */}
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
