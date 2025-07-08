import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Database, Clock, MapPin, Thermometer, Droplet } from "lucide-react";
import { PMScanData } from "@/lib/pmscan/types";
import { LocationData } from "@/types/PMScan";

interface DataLogEntry {
  id: string;
  timestamp: Date;
  pmData: PMScanData;
  location?: LocationData;
  missionContext?: {
    location: string;
    activity: string;
  };
}

interface DataLoggerProps {
  isRecording: boolean;
  currentData?: PMScanData;
  currentLocation?: LocationData;
  missionContext?: {
    location: string;
    activity: string;
  };
  className?: string;
}

export function DataLogger({ 
  isRecording, 
  currentData, 
  currentLocation, 
  missionContext,
  className 
}: DataLoggerProps) {
  const [dataLog, setDataLog] = useState<DataLogEntry[]>([]);

  // Add new data entry when recording and data is available
  useEffect(() => {
    if (isRecording && currentData) {
      console.log("📝 Adding data to logger:", { pm25: currentData.pm25, timestamp: currentData.timestamp });
      const newEntry: DataLogEntry = {
        id: Date.now().toString(),
        timestamp: currentData.timestamp,
        pmData: currentData,
        location: currentLocation,
        missionContext
      };
      
      setDataLog(prev => {
        const updated = [newEntry, ...prev.slice(0, 99)];
        console.log("📊 DataLog updated, total entries:", updated.length);
        return updated;
      });
    }
  }, [isRecording, currentData, currentLocation, missionContext]);

  const clearLog = () => {
    setDataLog([]);
  };

  const getAirQualityColor = (pm25: number) => {
    if (pm25 <= 12) return "text-air-good";
    if (pm25 <= 35) return "text-air-moderate";
    if (pm25 <= 55) return "text-air-poor";
    return "text-air-very-poor";
  };

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-card/50 border rounded-t-lg text-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span className="font-medium">Journal des données</span>
            <Badge variant={isRecording ? "default" : "secondary"} className="text-xs">
              {isRecording ? "Enregistrement" : "Arrêté"}
            </Badge>
          </div>
          <span className="text-muted-foreground">
            {dataLog.length} entrées
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          {dataLog.length > 0 && (
            <span className="text-muted-foreground text-xs">
              Dernière: {dataLog[0]?.timestamp.toLocaleTimeString('fr-FR')}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={clearLog}
            disabled={dataLog.length === 0}
            className="h-8"
          >
            Effacer
          </Button>
        </div>
      </div>

      {/* Console Log Display */}
      <div className="bg-background border-x border-b rounded-b-lg p-4 h-48 overflow-auto">
        {dataLog.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Aucune donnée enregistrée</p>
            <p className="text-xs mt-1">
              {isRecording ? "En attente de données..." : "Démarrez un enregistrement pour voir les données"}
            </p>
          </div>
        ) : (
          <div className="space-y-1 font-mono text-xs">
            {dataLog.map((entry) => (
              <div key={entry.id} className="text-muted-foreground">
                [{entry.timestamp.toLocaleTimeString('fr-FR')}] New reading: PM2.5={entry.pmData.pm25.toFixed(1)}ug/m³, Temp={entry.pmData.temp.toFixed(1)}°C
                {entry.location && (
                  <span> | GPS: {entry.location.latitude.toFixed(6)}, {entry.location.longitude.toFixed(6)} (+{Math.round(entry.location.accuracy || 0)}m)</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}