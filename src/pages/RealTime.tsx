import { useState, useEffect, useRef } from "react";
import { StatusButtons } from "@/components/RealTime/StatusButtons";
import { AirQualityCards } from "@/components/RealTime/AirQualityCards";
import { MapGraphToggle } from "@/components/RealTime/MapGraphToggle";
import { ContextSelectors } from "@/components/RecordingControls/ContextSelectors";
import { DataLogger } from "@/components/DataLogger";
import { BackgroundRecordingStatus } from "@/components/BackgroundRecordingStatus";
import { useUnifiedDeviceConnection } from "@/hooks/useUnifiedDeviceConnection";
import { toPMScanData, toPMScanDevice } from "@/lib/device/dataAdapter";
import { useGPS } from "@/hooks/useGPS";
import { useRecordingContext } from "@/contexts/RecordingContext";
import { useAlerts } from "@/contexts/AlertContext";

export default function RealTime() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showGraph, setShowGraph] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedActivity, setSelectedActivity] = useState("");
  
  const { currentData, isConnected, device, error, requestDevice, disconnect } = useUnifiedDeviceConnection();
  const { locationEnabled, latestLocation, requestLocationPermission } = useGPS();
  const { isRecording, addDataPoint, missionContext, recordingData, updateMissionContext } = useRecordingContext();
  const { checkAlerts } = useAlerts();

  // Add data to recording when new data comes in - with deduplication
  const lastDataRef = useRef<{ pm25: number; timestamp: number } | null>(null);
  
  useEffect(() => {
    console.log("🔍 RealTime effect triggered - isRecording:", isRecording, "currentData PM2.5:", currentData?.pm25);
    console.log("📍 Latest GPS location:", latestLocation);
    if (isRecording && currentData) {
      // Prevent duplicate data points by checking if this is actually new data
      const currentTimestamp = currentData.timestamp.getTime();
      const isDuplicate = lastDataRef.current && 
        lastDataRef.current.pm25 === currentData.pm25 && 
        Math.abs(currentTimestamp - lastDataRef.current.timestamp) < 500; // Less than 500ms apart
      
      if (!isDuplicate) {
        console.log("🎯 Adding new data point with PM2.5:", currentData.pm25, "and GPS:", latestLocation);
        // Convert unified data to PMScan format for recording compatibility
        const pmScanData = toPMScanData(currentData);
        addDataPoint(pmScanData, latestLocation || undefined, missionContext);
        lastDataRef.current = { pm25: currentData.pm25, timestamp: currentTimestamp };
      } else {
        console.log("⏭️ Skipping duplicate data point");
      }
    } else {
      console.log("❌ Not adding data - isRecording:", isRecording, "hasCurrentData:", !!currentData);
    }
  }, [isRecording, currentData, latestLocation, addDataPoint]);

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
        currentData={currentData ? toPMScanData(currentData) : null}
        recordingData={recordingData}
        isRecording={isRecording}
        device={device ? toPMScanDevice(device) : null}
      />

      {/* Background Recording Status */}
      <BackgroundRecordingStatus />

      {/* Real-time Readings - Air Quality Cards */}
      <AirQualityCards
        currentData={currentData ? toPMScanData(currentData) : null}
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
        currentData={currentData ? toPMScanData(currentData) : null}
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
