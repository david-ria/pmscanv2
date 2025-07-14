import { ConnectionCard } from './PMScan/ConnectionCard';
import { GPSStatusCard } from './PMScan/GPSStatusCard';
import { ConnectionStatus, PMScanDevice, LocationData } from '@/types/PMScan';

interface PMScanConnectionStatusProps {
  connectionStatus: ConnectionStatus;
  deviceInfo: PMScanDevice;
  locationEnabled: boolean;
  latestLocation: LocationData | null;
  onConnect: () => void;
  onDisconnect: () => void;
  onRequestLocationPermission: () => Promise<boolean>;
  className?: string;
}

export const PMScanConnectionStatus = ({
  connectionStatus,
  deviceInfo,
  locationEnabled,
  latestLocation,
  onConnect,
  onDisconnect,
  onRequestLocationPermission,
  className,
}: PMScanConnectionStatusProps) => {
  if (!connectionStatus.connected) {
    return (
      <div className={className}>
        <div className="space-y-3">
          <ConnectionCard
            connectionStatus={connectionStatus}
            deviceInfo={deviceInfo}
            onConnect={onConnect}
            onDisconnect={onDisconnect}
          />
          <GPSStatusCard
            locationEnabled={locationEnabled}
            latestLocation={latestLocation}
            onRequestPermission={onRequestLocationPermission}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex gap-2 justify-center">
        <div className="flex items-center gap-2 bg-card px-4 py-2 rounded-lg border shadow-sm">
          <div className="w-2 h-2 bg-success rounded-full"></div>
          <span className="text-sm font-medium">Connected</span>
          <button
            onClick={onDisconnect}
            className="ml-2 text-xs text-muted-foreground hover:text-destructive"
          >
            Disconnect
          </button>
        </div>

        <div className="flex items-center gap-2 bg-card px-4 py-2 rounded-lg border shadow-sm">
          {locationEnabled && latestLocation ? (
            <>
              <div className="w-2 h-2 bg-success rounded-full"></div>
              <span className="text-sm font-medium">GPS Active</span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 bg-muted rounded-full"></div>
              <span className="text-sm text-muted-foreground">No GPS</span>
              <button
                onClick={onRequestLocationPermission}
                className="ml-2 text-xs text-primary hover:underline"
              >
                Enable
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
