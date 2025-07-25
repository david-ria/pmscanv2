import { WifiOff, Map, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MapboxMap } from '@/components/MapboxMap';
import { PMLineGraph } from '@/components/PMLineGraph';
import { FloatingRecordButton } from '@/components/FloatingRecordButton';
import { PMScanData } from '@/lib/pmscan/types';
import { LocationData } from '@/types/PMScan';
import { PMScanDevice } from '@/lib/pmscan/types';
import { useTranslation } from 'react-i18next';

interface RecordingEntry {
  pmData: PMScanData;
  location?: LocationData;
}

interface EventData {
  id: string;
  timestamp: Date;
  event_type: string;
  comment?: string;
}

interface MapGraphToggleProps {
  showGraph: boolean;
  onToggleView: (showGraph: boolean) => void;
  isOnline: boolean;
  latestLocation: LocationData | null;
  currentData: PMScanData | null;
  recordingData: RecordingEntry[];
  events?: EventData[];
  isRecording: boolean;
  device: PMScanDevice | null;
  isConnected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onRequestLocationPermission: () => Promise<boolean>;
  locationEnabled: boolean;
}

export function MapGraphToggle({
  showGraph,
  onToggleView,
  isOnline,
  latestLocation,
  currentData,
  recordingData,
  events = [],
  isRecording,
  device,
  isConnected,
  onConnect,
  onDisconnect,
  onRequestLocationPermission,
  locationEnabled,
}: MapGraphToggleProps) {
  const { t } = useTranslation();

  // Calculate track points for the map
  const trackPoints = recordingData
    .map((entry) => ({
      longitude: entry.location?.longitude || 0,
      latitude: entry.location?.latitude || 0,
      pm25: entry.pmData.pm25,
      timestamp: entry.pmData.timestamp,
    }))
    .filter((point) => point.longitude !== 0 && point.latitude !== 0);
  return (
    <div className="mb-4">
      {/* Toggle Controls */}
      <div className="flex items-center justify-center mb-3">
        <div className="flex bg-muted p-1 rounded-lg">
          <Button
            variant={!showGraph ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onToggleView(false)}
            className="flex items-center gap-2"
          >
            <Map className="h-4 w-4" />
            {t('realTime.map')}
          </Button>
          <Button
            variant={showGraph ? 'default' : 'ghost'}
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
            events={events} 
            className="h-full"
            highlightContextType="location"
          />
        ) : (
          <>
            {!isOnline ? (
              <div className="h-full bg-card border border-border rounded-lg flex items-center justify-center">
                <div className="text-muted-foreground text-center">
                  <WifiOff className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>{t('realTime.connectionRequired')}</p>
                </div>
              </div>
            ) : !isRecording ? (
              <div className="h-full relative rounded-lg overflow-hidden border border-border bg-gradient-to-br from-muted/30 to-muted/60">
                {/* CSS-based fake map */}
                <div className="absolute inset-0">
                  {/* Street grid pattern */}
                  <div className="absolute inset-0 opacity-20">
                    {/* Horizontal lines */}
                    {Array.from({ length: 8 }, (_, i) => (
                      <div 
                        key={`h-${i}`}
                        className="absolute h-px bg-muted-foreground/30 w-full"
                        style={{ top: `${12.5 + i * 12.5}%` }}
                      />
                    ))}
                    {/* Vertical lines */}
                    {Array.from({ length: 6 }, (_, i) => (
                      <div 
                        key={`v-${i}`}
                        className="absolute w-px bg-muted-foreground/30 h-full"
                        style={{ left: `${16.6 + i * 16.6}%` }}
                      />
                    ))}
                  </div>
                  
                  {/* Fake building blocks */}
                  <div className="absolute top-[20%] left-[25%] w-8 h-6 bg-muted-foreground/20 rounded-sm"></div>
                  <div className="absolute top-[35%] right-[30%] w-10 h-8 bg-muted-foreground/20 rounded-sm"></div>
                  <div className="absolute bottom-[40%] left-[40%] w-6 h-10 bg-muted-foreground/20 rounded-sm"></div>
                  <div className="absolute bottom-[25%] right-[25%] w-12 h-6 bg-muted-foreground/20 rounded-sm"></div>
                </div>
                
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-background/90 backdrop-blur-sm px-4 py-2 rounded-lg border">
                    <p className="text-sm text-muted-foreground text-center">
                      {t('realTime.mapWillLoadWhenRecording')}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <MapboxMap
                currentLocation={latestLocation}
                pmData={currentData}
                trackPoints={trackPoints}
                isRecording={isRecording}
                className="h-full w-full"
                autoLoadOnRecording={isRecording}
              />
            )}
          </>
        )}

        {/* Floating Record Button - Always visible */}
        <FloatingRecordButton
          device={device}
          isConnected={isConnected}
          connectionStatus={{
            connected: isConnected,
            connecting: false,
            error: null,
          }}
          locationEnabled={locationEnabled}
          latestLocation={latestLocation}
          onConnect={onConnect}
          onDisconnect={onDisconnect}
          onRequestLocationPermission={onRequestLocationPermission}
          className="absolute bottom-4 right-4 z-10"
        />
      </div>
    </div>
  );
}
