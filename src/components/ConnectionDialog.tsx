import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PMScanConnectionStatus } from './PMScanConnectionStatus';
import { ConnectionStatus, PMScanDevice, LocationData } from '@/types/PMScan';

interface ConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectionStatus: ConnectionStatus;
  deviceInfo: PMScanDevice;
  locationEnabled: boolean;
  latestLocation: LocationData | null;
  onConnect: () => void;
  onDisconnect: () => void;
  onRequestLocationPermission: () => Promise<boolean>;
}

export const ConnectionDialog = ({
  open,
  onOpenChange,
  connectionStatus,
  deviceInfo,
  locationEnabled,
  latestLocation,
  onConnect,
  onDisconnect,
  onRequestLocationPermission,
}: ConnectionDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Connect to PMScan Device</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <PMScanConnectionStatus
            connectionStatus={connectionStatus}
            deviceInfo={deviceInfo}
            locationEnabled={locationEnabled}
            latestLocation={latestLocation}
            onConnect={onConnect}
            onDisconnect={onDisconnect}
            onRequestLocationPermission={onRequestLocationPermission}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};