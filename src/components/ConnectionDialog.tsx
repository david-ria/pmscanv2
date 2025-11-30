import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  onContinue?: () => void;
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
  onContinue,
}: ConnectionDialogProps) => {
  const { t } = useTranslation();
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('connection.title')}</DialogTitle>
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
            onContinue={onContinue}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
