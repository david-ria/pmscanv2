import { useState, useEffect, useRef } from "react";
import { Wifi, WifiOff, Map, Bug } from "lucide-react";
import { MapboxMap } from "@/components/MapboxMap";
import { RecordingControls } from "@/components/RecordingControls";
import { StatsCard } from "@/components/StatsCard";
import { PMScanConnectionStatus } from "@/components/PMScanConnectionStatus";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePMScanBluetooth } from "@/hooks/usePMScanBluetooth";
import { useGPS } from "@/hooks/useGPS";
import { cn } from "@/lib/utils";

export default function RealTime() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isRecording, setIsRecording] = useState(false);
  const [showDebugLog, setShowDebugLog] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const { currentData, isConnected, device, error, requestDevice, disconnect } = usePMScanBluetooth();
  const { locationEnabled, latestLocation, requestLocationPermission } = useGPS();
  const logEndRef = useRef<HTMLDivElement>(null);

  // Add debug log function
  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString('fr-FR');
    setDebugLogs(prev => [...prev.slice(-50), `[${timestamp}] ${message}`]); // Keep last 50 logs
  };

  // Debug logging for data reception
  useEffect(() => {
    if (currentData) {
      addDebugLog(`✅ Data received: PM1=${currentData.pm1} PM2.5=${currentData.pm25} PM10=${currentData.pm10}`);
    } else {
      addDebugLog('❌ No current data available');
    }
    addDebugLog(`🔗 Connection status: ${isConnected ? 'Connected' : 'Disconnected'}`);
  }, [currentData, isConnected]);

  // Log device status changes
  useEffect(() => {
    if (device) {
      addDebugLog(`📱 Device: ${device.name} (Battery: ${device.battery}%)`);
    }
  }, [device]);

  // Log errors
  useEffect(() => {
    if (error) {
      addDebugLog(`⚠️ Error: ${error}`);
    }
  }, [error]);

  // Auto-scroll debug log
  useEffect(() => {
    if (showDebugLog && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [debugLogs, showDebugLog]);

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
        onToggleRecording={() => setIsRecording(!isRecording)}
        className="mb-4"
      />

      {/* Debug Log Section */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Bug className="h-4 w-4" />
              Debug Log
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDebugLog(!showDebugLog)}
            >
              {showDebugLog ? 'Masquer' : 'Afficher'}
            </Button>
          </div>
        </CardHeader>
        {showDebugLog && (
          <CardContent className="pt-0">
            <div className="bg-muted/30 p-3 rounded-lg h-48 overflow-y-auto font-mono text-xs">
              {debugLogs.length === 0 ? (
                <div className="text-muted-foreground">Aucun log disponible...</div>
              ) : (
                debugLogs.map((log, index) => (
                  <div key={index} className="mb-1">
                    {log}
                  </div>
                ))
              )}
              <div ref={logEndRef} />
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>{debugLogs.length} entrées</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDebugLogs([])}
                className="h-auto p-0"
              >
                Effacer
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Today's Stats */}
      <StatsCard title="Statistiques du jour" stats={todayStats} />
    </div>
  );
}
