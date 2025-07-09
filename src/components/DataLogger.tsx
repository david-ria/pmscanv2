import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Database, Clock, MapPin, Thermometer, Droplet, ChevronDown, ChevronUp, Download } from "lucide-react";
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
  const [isMinimized, setIsMinimized] = useState(false);

  // Add new data entry when recording and data is available - max 1 per second
  useEffect(() => {
    if (isRecording && currentData) {
      setDataLog(prev => {
        // Check if we already have an entry within the last second
        const currentTime = currentData.timestamp.getTime();
        const hasRecentEntry = prev.length > 0 && 
          (currentTime - prev[0].timestamp.getTime()) < 1000; // Less than 1 second
        
        // Check if data is significantly different from last entry
        const isDataDifferent = prev.length === 0 || 
          Math.abs(prev[0].pmData.pm25 - currentData.pm25) >= 0.1 ||
          Math.abs(prev[0].pmData.pm1 - currentData.pm1) >= 0.1 ||
          Math.abs(prev[0].pmData.pm10 - currentData.pm10) >= 0.1;
        
        // Only add if enough time passed OR data is significantly different
        if (!hasRecentEntry || isDataDifferent) {
          console.log("📝 Adding data to logger:", { pm25: currentData.pm25, timestamp: currentData.timestamp });
          const newEntry: DataLogEntry = {
            id: Date.now().toString(),
            timestamp: currentData.timestamp,
            pmData: currentData,
            location: currentLocation,
            missionContext
          };
          
          const updated = [newEntry, ...prev.slice(0, 99)];
          console.log("📊 DataLog updated, total entries:", updated.length);
          return updated;
        }
        
        // Skip adding duplicate/too frequent entries
        return prev;
      });
    }
  }, [isRecording, currentData, currentLocation, missionContext]);

  const clearLog = () => {
    setDataLog([]);
  };

  const exportRawData = () => {
    if (dataLog.length === 0) return;

    const headers = [
      'Timestamp',
      'PM1 (μg/m³)',
      'PM2.5 (μg/m³)', 
      'PM10 (μg/m³)',
      'Temperature (°C)',
      'Humidity (%)',
      'Latitude',
      'Longitude',
      'GPS Accuracy (m)',
      'Location Context',
      'Activity Context'
    ];

    const csvContent = [
      headers.join(','),
      ...dataLog.map(entry => [
        entry.timestamp.toISOString(),
        entry.pmData.pm1.toFixed(2),
        entry.pmData.pm25.toFixed(2),
        entry.pmData.pm10.toFixed(2),
        entry.pmData.temp.toFixed(2),
        entry.pmData.humidity.toFixed(1),
        entry.location?.latitude?.toFixed(6) || '',
        entry.location?.longitude?.toFixed(6) || '',
        entry.location?.accuracy?.toFixed(0) || '',
        entry.missionContext?.location || '',
        entry.missionContext?.activity || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `journal-donnees-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4" />
          <span className="font-medium text-sm">Journal des données</span>
          <Badge variant={isRecording ? "default" : "secondary"} className="text-xs">
            {isRecording ? "Enregistrement" : "Arrêté"}
          </Badge>
          <span className="text-muted-foreground text-xs">
            {dataLog.length} entrées
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          {dataLog.length > 0 && (
            <span className="text-muted-foreground text-xs hidden sm:inline">
              Dernière: {dataLog[0]?.timestamp.toLocaleTimeString('fr-FR')}
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={exportRawData}
            disabled={dataLog.length === 0}
            className="h-8 w-8 p-0"
            title="Exporter les données brutes"
          >
            <Download className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clearLog}
            disabled={dataLog.length === 0}
            className="h-8 px-2 text-xs"
          >
            Effacer
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(!isMinimized)}
            className="h-8 w-8 p-0"
            title={isMinimized ? "Agrandir" : "Réduire"}
          >
            {isMinimized ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
        </div>
      </div>

      {/* Console Log Display */}
      {!isMinimized && (
        <div className="bg-background border-x border-b rounded-b-lg p-3 h-40 overflow-auto animate-accordion-down">
          {dataLog.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Database className="h-6 w-6 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aucune donnée enregistrée</p>
              <p className="text-xs mt-1">
                {isRecording ? "En attente de données..." : "Démarrez un enregistrement pour voir les données"}
              </p>
            </div>
          ) : (
            <div className="space-y-1 font-mono text-xs">
              {dataLog.map((entry) => (
                <div key={entry.id} className="text-muted-foreground break-all">
                  <div className="text-xs">
                    [{entry.timestamp.toLocaleTimeString('fr-FR')}] New reading: PM1={entry.pmData.pm1.toFixed(1)}ug/m³,
                  </div>
                  <div className="text-xs pl-2">
                    PM2.5={entry.pmData.pm25.toFixed(1)}ug/m³, PM10={entry.pmData.pm10.toFixed(1)}ug/m³, Temp={entry.pmData.temp.toFixed(1)}°C
                  </div>
                  {entry.location && (
                    <div className="text-xs pl-2">
                      GPS: {entry.location.latitude.toFixed(6)}, {entry.location.longitude.toFixed(6)} (+{Math.round(entry.location.accuracy || 0)}m)
                    </div>
                  )}
                  {entry.missionContext && (entry.missionContext.location || entry.missionContext.activity) && (
                    <div className="text-xs pl-2">
                      Tags: {[entry.missionContext.location, entry.missionContext.activity].filter(Boolean).join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Minimized state - show border bottom when minimized */}
      {isMinimized && (
        <div className="border-x border-b rounded-b-lg h-1"></div>
      )}
    </div>
  );
}