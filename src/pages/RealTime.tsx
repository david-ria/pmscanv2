import { useState, useEffect } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { MapboxMap } from "@/components/MapboxMap";
import { RecordingControls } from "@/components/RecordingControls";
import { StatsCard } from "@/components/StatsCard";
import { PMScanConnectionStatus } from "@/components/PMScanConnectionStatus";
import { DataLogger } from "@/components/DataLogger";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { usePMScanBluetooth } from "@/hooks/usePMScanBluetooth";
import { useGPS } from "@/hooks/useGPS";
import { useRecordingData } from "@/hooks/useRecordingData";

export default function RealTime() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { currentData, isConnected, device, error, requestDevice, disconnect } = usePMScanBluetooth();
  const { locationEnabled, latestLocation, requestLocationPermission } = useGPS();
  const { isRecording, addDataPoint, missionContext } = useRecordingData();

  // Add data to recording when new data comes in
  useEffect(() => {
    if (isRecording && currentData) {
      addDataPoint(currentData, latestLocation || undefined);
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

  const todayStats = [
    { label: "Moyenne PM2.5", value: 18, unit: "µg/m³", color: "moderate" as const },
    { label: "Pic max", value: 34, unit: "µg/m³", color: "moderate" as const },
    { label: "Exposition", value: "3h 24m", color: "default" as const },
    { label: "Mesures", value: 1247, color: "default" as const }
  ];

  return (
    <div className="min-h-screen bg-background pb-20 px-4 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">PMSCAN</h1>
          <p className="text-sm text-muted-foreground">Temps réel</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isOnline ? "default" : "destructive"} className="text-xs">
            {isOnline ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
            {isOnline ? "En ligne" : "Hors ligne"}
          </Badge>
        </div>
      </div>

      {/* Map - Top Half of Screen */}
      <div className="h-[45vh] mb-4">
        {isOnline ? (
          <MapboxMap 
            currentLocation={latestLocation}
            pmData={currentData}
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

      {/* Connection Status */}
      <PMScanConnectionStatus 
        connectionStatus={{
          connected: isConnected,
          connecting: false,
          error: error
        }}
        deviceInfo={device || {
          name: "PMScan Device",
          version: 0,
          mode: 0,
          interval: 0,
          battery: 0,
          charging: false,
          connected: false
        }}
        locationEnabled={locationEnabled}
        latestLocation={latestLocation}
        onConnect={() => requestDevice()}
        onDisconnect={() => disconnect()}
        onRequestLocationPermission={requestLocationPermission}
        className="mb-4" 
      />

      {/* Recording Controls */}
      <RecordingControls
        isRecording={isRecording}
        onToggleRecording={() => {}} // Not needed anymore, managed by the hook
        className="mb-4"
      />

      {/* Data Logger */}
      <DataLogger 
        isRecording={isRecording}
        currentData={currentData}
        currentLocation={latestLocation}
        missionContext={missionContext}
        className="mb-4"
      />

      {/* Today's Stats */}
      <StatsCard title="Statistiques du jour" stats={todayStats} />
    </div>
  );
}
