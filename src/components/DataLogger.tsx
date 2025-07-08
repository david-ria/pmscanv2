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
    <div className={`flex items-center justify-between p-3 bg-card/50 border rounded-lg text-sm ${className}`}>
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
  );
}