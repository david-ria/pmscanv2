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
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Database className="h-4 w-4" />
            Journal des données
            <Badge variant={isRecording ? "default" : "secondary"} className="text-xs">
              {isRecording ? "Enregistrement" : "Arrêté"}
            </Badge>
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={clearLog}
            disabled={dataLog.length === 0}
          >
            Effacer
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="h-64">
          {dataLog.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aucune donnée enregistrée</p>
              <p className="text-xs mt-1">
                {isRecording ? "En attente de données..." : "Démarrez un enregistrement pour voir les données"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {dataLog.map((entry) => (
                <div key={entry.id} className="border rounded-lg p-3 bg-card/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {entry.timestamp.toLocaleTimeString('fr-FR')}
                    </div>
                    {entry.location && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        GPS
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div className="text-center">
                      <div className="text-sm font-medium">PM1</div>
                      <div className="text-lg font-bold text-foreground">
                        {Math.round(entry.pmData.pm1)}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium">PM2.5</div>
                      <div className={`text-lg font-bold ${getAirQualityColor(entry.pmData.pm25)}`}>
                        {Math.round(entry.pmData.pm25)}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium">PM10</div>
                      <div className="text-lg font-bold text-foreground">
                        {Math.round(entry.pmData.pm10)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Thermometer className="h-3 w-3" />
                        {Math.round(entry.pmData.temp)}°C
                      </div>
                      <div className="flex items-center gap-1">
                        <Droplet className="h-3 w-3" />
                        {Math.round(entry.pmData.humidity)}%
                      </div>
                    </div>
                    {entry.missionContext && (
                      <div className="text-right">
                        <span className="font-medium">{entry.missionContext.location}</span>
                        <span className="mx-1">•</span>
                        <span>{entry.missionContext.activity}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        <div className="mt-3 flex justify-between text-xs text-muted-foreground">
          <span>{dataLog.length} entrées</span>
          {dataLog.length > 0 && (
            <span>
              Dernière: {dataLog[0]?.timestamp.toLocaleTimeString('fr-FR')}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}