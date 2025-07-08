import { Bluetooth, BluetoothOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConnectionStatus, PMScanDevice } from '@/types/PMScan';

interface ConnectionCardProps {
  connectionStatus: ConnectionStatus;
  deviceInfo: PMScanDevice;
  onConnect: () => void;
  onDisconnect: () => void;
}

export const ConnectionCard = ({
  connectionStatus,
  deviceInfo,
  onConnect,
  onDisconnect
}: ConnectionCardProps) => {
  if (connectionStatus.connected) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-success rounded-full"></div>
              <div>
                <div className="font-medium text-sm">{deviceInfo.name}</div>
                <div className="text-xs text-muted-foreground">
                  Battery: {deviceInfo.battery}% • Version: {deviceInfo.version}
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onDisconnect}
              className="text-xs"
            >
              Disconnect
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BluetoothOff className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="font-medium text-sm">PMScan Device</div>
              <div className="text-xs text-muted-foreground">
                {connectionStatus.connecting ? 'Connecting...' : 'Not connected'}
              </div>
              {connectionStatus.error && (
                <div className="text-xs text-destructive">{connectionStatus.error}</div>
              )}
            </div>
          </div>
          <Button 
            onClick={onConnect} 
            disabled={connectionStatus.connecting}
            className="flex-1"
          >
            <Bluetooth className="h-4 w-4" />
            Connect Device
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};