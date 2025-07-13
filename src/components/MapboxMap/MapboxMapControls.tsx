import { Button } from "@/components/ui/button";
import { Map, Satellite, MapPin } from "lucide-react";
import { LocationData } from "@/types/PMScan";

interface MapboxMapControlsProps {
  isSatellite: boolean;
  onToggleMapStyle: () => void;
  currentLocation: LocationData | null;
}

export const MapboxMapControls = ({ 
  isSatellite, 
  onToggleMapStyle, 
  currentLocation 
}: MapboxMapControlsProps) => {
  return (
    <>
      {/* Satellite/Map Toggle Button */}
      <div className="absolute top-3 left-3 z-10">
        <Button
          onClick={onToggleMapStyle}
          size="sm"
          variant="secondary"
          className="bg-background/90 backdrop-blur-sm border border-border shadow-lg hover:bg-background"
        >
          {isSatellite ? (
            <>
              <Map className="h-4 w-4 mr-2" />
              Carte
            </>
          ) : (
            <>
              <Satellite className="h-4 w-4 mr-2" />
              Satellite
            </>
          )}
        </Button>
      </div>
      
      {/* Location Accuracy Display */}
      {currentLocation && (
        <div className="absolute bottom-3 left-3 bg-background/90 backdrop-blur-sm p-2 rounded-md border border-border">
          <div className="flex items-center gap-2 text-xs">
            <MapPin className="h-3 w-3 text-primary" />
            <span className="text-muted-foreground">
              ±{currentLocation.accuracy.toFixed(0)}m accuracy
            </span>
          </div>
        </div>
      )}
    </>
  );
};
