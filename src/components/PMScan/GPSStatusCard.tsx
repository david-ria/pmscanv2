import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Satellite, AlertTriangle } from 'lucide-react';
import { LocationData } from '@/types/PMScan';

interface GPSStatusCardProps {
  locationEnabled: boolean;
  latestLocation: LocationData | null;
  onRequestPermission: () => Promise<boolean>;
  onContinue?: () => void;
}

export const GPSStatusCard = ({
  locationEnabled,
  latestLocation,
  onRequestPermission,
  onContinue,
}: GPSStatusCardProps) => {
  const getAccuracyColor = (accuracy: number) => {
    if (accuracy <= 5) return 'text-success';
    if (accuracy <= 10) return 'text-warning';
    return 'text-destructive';
  };

  const getAccuracyLevel = (accuracy: number) => {
    if (accuracy <= 5) return 'Excellent';
    if (accuracy <= 10) return 'Good';
    if (accuracy <= 20) return 'Fair';
    return 'Poor';
  };

  return (
    <Card className="p-6 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">GPS Location</h3>
        </div>
        <Badge variant={locationEnabled ? 'default' : 'outline'}>
          {locationEnabled ? 'Enabled' : 'Disabled'}
        </Badge>
      </div>

      {!locationEnabled ? (
        <div className="text-center py-6">
          <AlertTriangle className="h-8 w-8 text-warning mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">
            Location access is required to add GPS coordinates to measurements
          </p>
          <Button onClick={onRequestPermission} className="gap-2">
            <MapPin className="h-4 w-4" />
            Enable GPS
          </Button>
        </div>
      ) : !latestLocation ? (
        <div className="text-center py-6">
          <div className="animate-pulse">
            <Satellite className="h-8 w-8 text-primary mx-auto mb-3" />
            <p className="text-muted-foreground">Waiting for GPS signal...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Real-time coordinates display */}
          <div className="bg-gradient-to-br from-primary/5 to-primary/10 p-4 rounded-lg border border-primary/20">
            <div className="flex items-center gap-2 mb-3">
              <Satellite className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                Live GPS Coordinates
              </span>
              <div className="flex-1" />
              <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Latitude:</span>
                <span className="font-mono text-lg font-semibold text-primary">
                  {latestLocation.latitude.toFixed(6)}°
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Longitude:
                </span>
                <span className="font-mono text-lg font-semibold text-primary">
                  {latestLocation.longitude.toFixed(6)}°
                </span>
              </div>
              {latestLocation.altitude && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Elevation:
                  </span>
                  <span className="font-mono text-lg font-semibold text-primary">
                    {latestLocation.altitude.toFixed(1)}m
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Accuracy and status */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <p className="text-muted-foreground">GPS Accuracy</p>
              <div className="flex items-center gap-2">
                <p
                  className={`font-mono text-sm ${getAccuracyColor(latestLocation.accuracy)}`}
                >
                  ±{latestLocation.accuracy.toFixed(0)}m
                </p>
                <Badge variant="outline" className="text-xs">
                  {getAccuracyLevel(latestLocation.accuracy)}
                </Badge>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Last Update</p>
              <p className="font-mono text-sm">
                {new Date(latestLocation.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
          
          {/* Continue button */}
          {onContinue && (
            <Button onClick={onContinue} className="w-full gap-2">
              <MapPin className="h-4 w-4" />
              Continue to Recording Setup
            </Button>
          )}
        </div>
      )}
    </Card>
  );
};
