import { MapPin, MapPinOff } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LocationData } from '@/types/PMScan';

interface GPSStatusCardProps {
  locationEnabled: boolean;
  latestLocation: LocationData | null;
  onRequestPermission: () => Promise<boolean>;
}

export const GPSStatusCard = ({
  locationEnabled,
  latestLocation,
  onRequestPermission
}: GPSStatusCardProps) => {
  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {locationEnabled && latestLocation ? (
              <>
                <div className="w-3 h-3 bg-success rounded-full"></div>
                <div>
                  <div className="font-medium text-sm flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    GPS Active
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Accuracy: {latestLocation.accuracy.toFixed(1)}m
                  </div>
                </div>
              </>
            ) : (
              <>
                <MapPinOff className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="font-medium text-sm">GPS Disabled</div>
                  <div className="text-xs text-muted-foreground">
                    Location not available
                  </div>
                </div>
              </>
            )}
          </div>
          {!locationEnabled && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRequestPermission}
              className="text-xs"
            >
              Enable GPS
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};