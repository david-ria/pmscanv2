import { useState, useEffect } from "react";
import { Wifi, WifiOff, Map } from "lucide-react";
import { RecordingControls } from "@/components/RecordingControls";
import { StatsCard } from "@/components/StatsCard";
import { BluetoothConnection } from "@/components/BluetoothConnection";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { usePMScanBluetooth } from "@/hooks/usePMScanBluetooth";
import { cn } from "@/lib/utils";

export default function RealTime() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isRecording, setIsRecording] = useState(false);
  const { currentData: bluetoothData, isConnected } = usePMScanBluetooth();
  
  // Fallback data when not connected to Bluetooth
  const [fallbackData, setFallbackData] = useState({
    pm1: 8,
    pm25: 15,
    pm10: 22,
    location: "Quartier Santé Respire",
    timestamp: new Date()
  });

  // Use Bluetooth data if available, otherwise use fallback
  const currentData = bluetoothData || fallbackData;

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Only simulate data when not connected to Bluetooth
    let interval: NodeJS.Timeout | null = null;
    if (!isConnected) {
      interval = setInterval(() => {
        setFallbackData(prev => ({
          ...prev,
          pm1: Math.max(0, prev.pm1 + (Math.random() - 0.5) * 4),
          pm25: Math.max(0, prev.pm25 + (Math.random() - 0.5) * 6),
          pm10: Math.max(0, prev.pm10 + (Math.random() - 0.5) * 8),
          timestamp: new Date()
        }));
      }, 3000);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (interval) clearInterval(interval);
    };
  }, [isConnected]);

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
      <div className="h-[45vh] bg-card border border-border rounded-lg mb-4 flex items-center justify-center">
        <div className="text-muted-foreground text-center">
          {isOnline ? (
            <div>
              <Map className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Vue carte - {currentData.location}</p>
            </div>
          ) : (
            <div>
              <WifiOff className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Connexion requise pour la vue carte</p>
            </div>
          )}
        </div>
      </div>

      {/* Real-time Readings - Three Squares */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {/* PM1 */}
        <Card className="text-center">
          <CardContent className="p-4">
            <div className="text-3xl font-bold text-foreground mb-1">
              {Math.round(currentData.pm1)}
            </div>
            <div className="text-xs text-muted-foreground">PM1</div>
            <div className="text-xs text-muted-foreground">µg/m³</div>
          </CardContent>
        </Card>

        {/* PM2.5 */}
        <Card className="text-center relative overflow-hidden">
          <div 
            className={cn(
              "absolute inset-0 opacity-10",
              `bg-${getAirQualityLevel(currentData.pm25).color}`
            )}
          />
          <CardContent className="p-4 relative">
            <div className={cn(
              "text-3xl font-bold mb-1",
              `text-${getAirQualityLevel(currentData.pm25).color}`
            )}>
              {Math.round(currentData.pm25)}
            </div>
            <div className="text-xs text-muted-foreground">PM2.5</div>
            <div className="text-xs text-muted-foreground">µg/m³</div>
            <div className="text-xs mt-1 font-medium">
              {getAirQualityLevel(currentData.pm25).label}
            </div>
          </CardContent>
        </Card>

        {/* PM10 */}
        <Card className="text-center">
          <CardContent className="p-4">
            <div className="text-3xl font-bold text-foreground mb-1">
              {Math.round(currentData.pm10)}
            </div>
            <div className="text-xs text-muted-foreground">PM10</div>
            <div className="text-xs text-muted-foreground">µg/m³</div>
          </CardContent>
        </Card>
      </div>

      {/* Bluetooth Connection */}
      <BluetoothConnection className="mb-4" />

      {/* Recording Controls */}
      <RecordingControls
        isRecording={isRecording}
        onToggleRecording={() => setIsRecording(!isRecording)}
        className="mb-4"
      />

      {/* Today's Stats */}
      <StatsCard title="Statistiques du jour" stats={todayStats} />
    </div>
  );
}