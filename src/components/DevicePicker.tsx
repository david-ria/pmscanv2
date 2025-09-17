import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bluetooth, Battery, Signal, Trash2 } from 'lucide-react';
import { FoundDevice } from '@/lib/bleScan';
import { PMScanDeviceStorage } from '@/lib/pmscan/deviceStorage';

interface DevicePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  devices: FoundDevice[];
  onDeviceSelected: (device: FoundDevice) => void;
  onForgetDevice?: () => void;
}

export const DevicePicker = ({
  open,
  onOpenChange,
  devices,
  onDeviceSelected,
  onForgetDevice,
}: DevicePickerProps) => {
  const preferredDevice = PMScanDeviceStorage.getPreferredDevice();

  const handleDeviceSelect = (device: FoundDevice) => {
    onDeviceSelected(device);
    onOpenChange(false);
  };

  const handleForgetDevice = () => {
    PMScanDeviceStorage.forgetPreferredDevice();
    onForgetDevice?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bluetooth className="h-5 w-5" />
            Select PMScan Device
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3">
          {devices.map((device) => {
            const isPreferred = preferredDevice?.deviceId === device.deviceId;
            
            return (
              <div
                key={device.deviceId}
                className={`p-4 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${
                  isPreferred ? 'border-primary bg-primary/5' : 'border-border'
                }`}
                onClick={() => handleDeviceSelect(device)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{device.name || 'PMScan Device'}</h4>
                      {isPreferred && (
                        <Badge variant="secondary" className="text-xs">
                          Preferred
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground font-mono">
                      ID: {device.deviceId.slice(-8)}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {device.rssi && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Signal className="h-3 w-3" />
                        <span>{device.rssi}dBm</span>
                      </div>
                    )}
                    <Bluetooth className="h-4 w-4 text-blue-500" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-between pt-4">
          {preferredDevice && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleForgetDevice}
              className="flex items-center gap-2 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
              Forget Preferred Device
            </Button>
          )}
          
          <div className="flex-1" />
          
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};