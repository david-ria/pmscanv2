import { WifiOff, Map, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MapboxMap } from "@/components/MapboxMap";
import { PMLineGraph } from "@/components/PMLineGraph";
import { FloatingRecordButton } from "@/components/FloatingRecordButton";
import { PMScanData } from "@/lib/pmscan/types";
import { LocationData } from "@/types/PMScan";
import { PMScanDevice } from "@/lib/pmscan/types";
import { useTranslation } from "react-i18next";

interface RecordingEntry {
  pmData: PMScanData;
  location?: LocationData;
}

interface MapGraphToggleProps {
  showGraph: boolean;
  onToggleView: (showGraph: boolean) => void;
  isOnline: boolean;
  latestLocation: LocationData | null;
  currentData: PMScanData | null;
  recordingData: RecordingEntry[];
  isRecording: boolean;
  device: PMScanDevice | null;
}

export function MapGraphToggle({
  showGraph,
  onToggleView,
  isOnline,
  latestLocation,
  currentData,
  recordingData,
  isRecording,
  device
}: MapGraphToggleProps) {
  const { t } = useTranslation();
  
  // Debug log to check track points
  const trackPoints = recordingData.map(entry => ({
    longitude: entry.location?.longitude || 0,
    latitude: entry.location?.latitude || 0,
    pm25: entry.pmData.pm25,
    timestamp: entry.pmData.timestamp
  })).filter(point => point.longitude !== 0 && point.latitude !== 0);
  
  console.log('Recording data:', recordingData.length, 'Track points:', trackPoints.length);
  return (
    <div className="mb-4">
      {/* Toggle Controls */}
      <div className="flex items-center justify-center mb-3">
        <div className="flex bg-muted p-1 rounded-lg">
          <Button
            variant={!showGraph ? "default" : "ghost"}
            size="sm"
            onClick={() => onToggleView(false)}
            className="flex items-center gap-2"
          >
            <Map className="h-4 w-4" />
            {t('realTime.map')}
          </Button>
          <Button
            variant={showGraph ? "default" : "ghost"}
            size="sm"
            onClick={() => onToggleView(true)}
            className="flex items-center gap-2"
          >
            <TrendingUp className="h-4 w-4" />
            {t('realTime.graph')}
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
                trackPoints={trackPoints}
                isRecording={isRecording}
                className="h-full w-full"
              />
            ) : (
              <div className="h-full bg-card border border-border rounded-lg flex items-center justify-center">
                <div className="text-muted-foreground text-center">
                  <WifiOff className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>{t('realTime.connectionRequired')}</p>
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
  );
}