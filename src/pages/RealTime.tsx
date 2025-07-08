import { useState, useEffect } from "react";
import { Wifi, WifiOff, Map, BarChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AirQualityCard } from "@/components/AirQualityCard";
import { RecordingControls } from "@/components/RecordingControls";
import { StatsCard } from "@/components/StatsCard";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function RealTime() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isRecording, setIsRecording] = useState(false);
  const [viewMode, setViewMode] = useState<"graph" | "map">("graph");
  const [currentData, setCurrentData] = useState({
    pm1: 8,
    pm25: 15,
    pm10: 22,
    location: "Quartier Santé Respire",
    timestamp: new Date()
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Simulate real-time data updates
    const interval = setInterval(() => {
      setCurrentData(prev => ({
        ...prev,
        pm1: Math.max(0, prev.pm1 + (Math.random() - 0.5) * 4),
        pm25: Math.max(0, prev.pm25 + (Math.random() - 0.5) * 6),
        pm10: Math.max(0, prev.pm10 + (Math.random() - 0.5) * 8),
        timestamp: new Date()
      }));
    }, 3000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const todayStats = [
    { label: "Moyenne PM2.5", value: 18, unit: "µg/m³", color: "moderate" as const },
    { label: "Pic max", value: 34, unit: "µg/m³", color: "moderate" as const },
    { label: "Exposition", value: "3h 24m", color: "default" as const },
    { label: "Mesures", value: 1247, color: "default" as const }
  ];

  return (
    <div className="min-h-screen bg-background pb-20 px-4 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
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

      {/* Air Quality Card */}
      <AirQualityCard data={currentData} className="mb-6" />

      {/* View Toggle */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <Button
          variant={viewMode === "graph" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewMode("graph")}
          className="flex items-center gap-2"
        >
          <BarChart className="h-4 w-4" />
          Graphique
        </Button>
        <Button
          variant={viewMode === "map" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewMode("map")}
          disabled={!isOnline}
          className="flex items-center gap-2"
        >
          <Map className="h-4 w-4" />
          Carte
        </Button>
      </div>

      {/* Recording Controls */}
      <RecordingControls
        isRecording={isRecording}
        onToggleRecording={() => setIsRecording(!isRecording)}
        className="mb-6"
      />

      {/* Today's Stats */}
      <StatsCard title="Statistiques du jour" stats={todayStats} className="mb-6" />

      {/* Graph/Map Placeholder */}
      <div className="bg-card border border-border rounded-lg p-6 text-center">
        <div className="text-muted-foreground">
          {viewMode === "map" ? (
            isOnline ? (
              <div>
                <Map className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Vue carte en cours de développement</p>
              </div>
            ) : (
              <div>
                <WifiOff className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Connexion requise pour la vue carte</p>
              </div>
            )
          ) : (
            <div>
              <BarChart className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Graphique temps réel en cours de développement</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}