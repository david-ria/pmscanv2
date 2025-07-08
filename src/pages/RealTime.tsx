import { useState, useEffect } from "react";
import { Wifi, WifiOff, Map, TrendingUp } from "lucide-react";
import { MapboxMap } from "@/components/MapboxMap";
import { PMLineGraph } from "@/components/PMLineGraph";
import { FloatingRecordButton } from "@/components/FloatingRecordButton";
import { ContextSelectors } from "@/components/RecordingControls/ContextSelectors";
import { DataLogger } from "@/components/DataLogger";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePMScanBluetooth } from "@/hooks/usePMScanBluetooth";
import { useGPS } from "@/hooks/useGPS";
import { useRecordingContext } from "@/contexts/RecordingContext";
import { cn } from "@/lib/utils";

export default function RealTime() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showGraph, setShowGraph] = useState(false); // Toggle state for map/graph
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedActivity, setSelectedActivity] = useState("");
  
  const { currentData, isConnected, device, error, requestDevice, disconnect } = usePMScanBluetooth();
  const { locationEnabled, latestLocation, requestLocationPermission } = useGPS();
  const { isRecording, addDataPoint, missionContext, recordingData } = useRecordingContext();

  // Add data to recording when new data comes in
  useEffect(() => {
    console.log("🔍 RealTime effect triggered - isRecording:", isRecording, "currentData PM2.5:", currentData?.pm25);
    if (isRecording && currentData) {
      console.log("🎯 About to call addDataPoint with:", currentData.pm25);
      addDataPoint(currentData, latestLocation || undefined);
    } else {
      console.log("❌ Not adding data - isRecording:", isRecording, "hasCurrentData:", !!currentData);
    }
  }, [isRecording, currentData, latestLocation, addDataPoint]);


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

  const getAirQualityLevel = (pm25: number) => {
    if (pm25 <= 12) return { level: "good", label: "Bon", color: "air-good" };
    if (pm25 <= 35) return { level: "moderate", label: "Modéré", color: "air-moderate" };
    if (pm25 <= 55) return { level: "poor", label: "Mauvais", color: "air-poor" };
    return { level: "very-poor", label: "Très mauvais", color: "air-very-poor" };
  };


  return (
    <div className="min-h-screen bg-background px-4 py-6">
      {/* Status Buttons Bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {/* PMScan Status Button */}
          <button
            onClick={() => isConnected ? disconnect() : requestDevice()}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
              isConnected 
                ? "bg-green-500/20 text-green-700 border border-green-500/30" 
                : "bg-red-500/20 text-red-700 border border-red-500/30"
            )}
          >
            <div className={cn(
              "w-2 h-2 rounded-full",
              isConnected ? "bg-green-500" : "bg-red-500"
            )} />
            PMScan {isConnected ? "Connecté" : "Déconnecté"}
          </button>

          {/* GPS Status Button */}
          <button
            onClick={requestLocationPermission}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
              locationEnabled 
                ? "bg-green-500/20 text-green-700 border border-green-500/30" 
                : "bg-red-500/20 text-red-700 border border-red-500/30"
            )}
          >
            <div className={cn(
              "w-2 h-2 rounded-full",
              locationEnabled ? "bg-green-500" : "bg-red-500"
            )} />
            GPS {locationEnabled ? "Activé" : "Désactivé"}
          </button>
        </div>

        {/* Recording Status */}
        {isRecording && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/20 text-red-700 border border-red-500/30 text-xs font-medium">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Enregistrement...
          </div>
        )}
      </div>

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

      {/* Map/Graph Toggle Section */}
      <div className="mb-4">
        {/* Toggle Controls */}
        <div className="flex items-center justify-center mb-3">
          <div className="flex bg-muted p-1 rounded-lg">
            <Button
              variant={!showGraph ? "default" : "ghost"}
              size="sm"
              onClick={() => setShowGraph(false)}
              className="flex items-center gap-2"
            >
              <Map className="h-4 w-4" />
              Carte
            </Button>
            <Button
              variant={showGraph ? "default" : "ghost"}
              size="sm"
              onClick={() => setShowGraph(true)}
              className="flex items-center gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              Graphique
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="h-[45vh] relative">
          {showGraph ? (
            <PMLineGraph 
              data={recordingData}
              className="h-full"
            />
          ) : (
            <>
              {isOnline ? (
                <MapboxMap 
                  currentLocation={latestLocation}
                  pmData={currentData}
                  trackPoints={recordingData.map(entry => ({
                    longitude: entry.location?.longitude || 0,
                    latitude: entry.location?.latitude || 0,
                    pm25: entry.pmData.pm25,
                    timestamp: entry.pmData.timestamp
                  })).filter(point => point.longitude !== 0 && point.latitude !== 0)}
                  isRecording={isRecording}
                  className="h-full w-full"
                />
              ) : (
                <div className="h-full bg-card border border-border rounded-lg flex items-center justify-center">
                  <div className="text-muted-foreground text-center">
                    <WifiOff className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Connexion requise pour la vue carte</p>
                  </div>
                </div>
              )}
              
              {/* Floating Record Button */}
              {!showGraph && (
                <FloatingRecordButton
                  device={device}
                  className="absolute bottom-4 right-4 z-10"
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Real-time Readings - Three Cards */}
      {isConnected && currentData ? (
        <div className="grid grid-cols-3 gap-3 mb-4">
          {/* PM1 */}
          <Card className="text-center bg-card/50">
            <CardContent className="p-4">
              <div className="text-3xl font-bold text-foreground mb-1">
                {Math.round(currentData.pm1)}
              </div>
              <div className="text-sm font-medium text-muted-foreground">PM1</div>
              <div className="text-xs text-muted-foreground">μg/m³</div>
            </CardContent>
          </Card>

          {/* PM2.5 - Main indicator with quality status */}
          <Card className="text-center relative overflow-hidden">
            <div 
              className="absolute inset-0 opacity-20"
              style={{backgroundColor: `hsl(var(--${getAirQualityLevel(currentData.pm25).color}))`}}
            />
            <CardContent className="p-4 relative">
              <div 
                className="text-3xl font-bold mb-1"
                style={{color: `hsl(var(--${getAirQualityLevel(currentData.pm25).color}))`}}
              >
                {Math.round(currentData.pm25)}
              </div>
              <div className="text-sm font-medium text-muted-foreground">PM2.5</div>
              <div className="text-xs text-muted-foreground mb-2">μg/m³</div>
              <div 
                className="text-xs font-medium px-2 py-1 rounded-full"
                style={{
                  backgroundColor: `hsl(var(--${getAirQualityLevel(currentData.pm25).color}) / 0.2)`,
                  color: `hsl(var(--${getAirQualityLevel(currentData.pm25).color}))`
                }}
              >
                {getAirQualityLevel(currentData.pm25).label}
              </div>
            </CardContent>
          </Card>

          {/* PM10 */}
          <Card className="text-center bg-card/50">
            <CardContent className="p-4">
              <div className="text-3xl font-bold text-foreground mb-1">
                {Math.round(currentData.pm10)}
              </div>
              <div className="text-sm font-medium text-muted-foreground">PM10</div>
              <div className="text-xs text-muted-foreground">μg/m³</div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 mb-4">
          {/* No Data Cards */}
          <Card className="text-center bg-muted/30">
            <CardContent className="p-4">
              <div className="text-3xl font-bold text-muted-foreground mb-1">--</div>
              <div className="text-sm font-medium text-muted-foreground">PM1</div>
              <div className="text-xs text-muted-foreground">μg/m³</div>
            </CardContent>
          </Card>
          <Card className="text-center bg-muted/30">
            <CardContent className="p-4">
              <div className="text-3xl font-bold text-muted-foreground mb-1">--</div>
              <div className="text-sm font-medium text-muted-foreground">PM2.5</div>
              <div className="text-xs text-muted-foreground">μg/m³</div>
            </CardContent>
          </Card>
          <Card className="text-center bg-muted/30">
            <CardContent className="p-4">
              <div className="text-3xl font-bold text-muted-foreground mb-1">--</div>
              <div className="text-sm font-medium text-muted-foreground">PM10</div>
              <div className="text-xs text-muted-foreground">μg/m³</div>
            </CardContent>
          </Card>
        </div>
      )}


      {/* Real-time Status */}
      {isConnected && currentData && (
        <div className="text-center text-xs text-muted-foreground mb-4">
          Dernière mesure : {currentData.timestamp.toLocaleTimeString('fr-FR')}
        </div>
      )}

      {!isConnected && (
        <div className="text-center text-sm text-muted-foreground mb-4 p-4 bg-muted/20 rounded-lg">
          Connectez votre capteur PMScan pour voir les données en temps réel
        </div>
      )}

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
