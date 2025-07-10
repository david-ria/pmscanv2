import { useState, useEffect, useRef } from "react";
import { StatusButtons } from "@/components/RealTime/StatusButtons";
import { AirQualityCards } from "@/components/RealTime/AirQualityCards";
import { MapGraphToggle } from "@/components/RealTime/MapGraphToggle";
import { ContextSelectors } from "@/components/RecordingControls/ContextSelectors";
import { DataLogger } from "@/components/DataLogger";
import { BackgroundRecordingStatus } from "@/components/BackgroundRecordingStatus";

import { usePMScanBluetooth } from "@/hooks/usePMScanBluetooth";
import { useGPS } from "@/hooks/useGPS";
import { useRecordingContext } from "@/contexts/RecordingContext";
import { useAlerts } from "@/contexts/AlertContext";

export default function RealTime() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showGraph, setShowGraph] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedActivity, setSelectedActivity] = useState("");
  
  const { currentData, isConnected, device, error, requestDevice, disconnect } = usePMScanBluetooth();
  const { locationEnabled, latestLocation, requestLocationPermission } = useGPS();
  const { isRecording, addDataPoint, missionContext, recordingData, updateMissionContext } = useRecordingContext();
  const { checkAlerts } = useAlerts();

  // Add data to recording when new data comes in - with deduplication
  const lastDataRef = useRef<{ pm25: number; timestamp: number } | null>(null);
  
  useEffect(() => {
    if (isRecording && currentData) {
      // Prevent duplicate data points by checking if this is actually new data
      const currentTimestamp = currentData.timestamp.getTime();
      const isDuplicate = lastDataRef.current && 
        lastDataRef.current.pm25 === currentData.pm25 && 
        Math.abs(currentTimestamp - lastDataRef.current.timestamp) < 500; // Less than 500ms apart
      
      if (!isDuplicate) {
        // Ensure we pass location data even if it's null
        console.log('Adding data point with location:', latestLocation);
        addDataPoint(currentData, latestLocation || undefined, missionContext);
        lastDataRef.current = { pm25: currentData.pm25, timestamp: currentTimestamp };
      }
    }
  }, [isRecording, currentData, latestLocation, addDataPoint, missionContext]);

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

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      {/* Status Buttons Bar */}
      <StatusButtons
        isConnected={isConnected}
        locationEnabled={locationEnabled}
        isRecording={isRecording}
        onConnectDevice={requestDevice}
        onDisconnectDevice={disconnect}
        onRequestLocationPermission={requestLocationPermission}
      />

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
      />


      {/* Background Recording Status */}
      <BackgroundRecordingStatus />

      {/* Real-time Readings - Air Quality Cards */}
      <AirQualityCards
        currentData={currentData}
        isConnected={isConnected}
      />

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
          activity: selectedActivity
        }}
        className="mb-4"
      />
    </div>
  );
}
