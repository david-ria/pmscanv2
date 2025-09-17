import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bluetooth, Battery, Signal, Trash2, RotateCcw } from 'lucide-react';
import { FoundDevice } from '@/lib/bleScan';
import { PMScanDeviceStorage } from '@/lib/pmscan/deviceStorage';
import { safeBleDebugger } from '@/lib/bleSafeWrapper';
import { useState, useEffect } from 'react';

interface DevicePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filteredDevices: FoundDevice[];
  rawDevices: FoundDevice[];
  onDeviceSelected: (device: FoundDevice) => void;
  onForgetDevice?: () => void;
  onRescan?: () => void;
  isScanning?: boolean;
}

export const DevicePicker = ({
  open,
  onOpenChange,
  filteredDevices,
  rawDevices,
  onDeviceSelected,
  onForgetDevice,
  onRescan,
  isScanning = false,
}: DevicePickerProps) => {
  const preferredDevice = PMScanDeviceStorage.getPreferredDevice();
  const [showAllDevices, setShowAllDevices] = useState(false);

  // Determine which devices to show
  const devicesToShow = showAllDevices ? rawDevices : filteredDevices;
  const hasFilteredDevices = filteredDevices.length > 0;
  const hasRawDevices = rawDevices.length > 0;

  // Log picker UI state changes
  useEffect(() => {
    if (open) {
      safeBleDebugger.info('PICKER', '[BLE:PICKER:UI] mount/open', undefined, { 
        filteredCount: filteredDevices.length,
        rawCount: rawDevices.length 
      });
    } else {
      safeBleDebugger.info('PICKER', '[BLE:PICKER:UI] close');
    }
  }, [open, filteredDevices.length, rawDevices.length]);

  const handleDeviceSelect = (device: FoundDevice) => {
    safeBleDebugger.info('PICKER', '[BLE:PICKER:UI] select', undefined, {
      id: device.deviceId.slice(-8),
      name: device.name
    });
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
        
        <div className="space-y-4">
          {/* Device list header with toggle */}
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">
              {hasFilteredDevices 
                ? `PMScan Devices (${filteredDevices.length})` 
                : `Available Devices (${rawDevices.length})`}
            </h4>
            
            {!hasFilteredDevices && hasRawDevices && (
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="show-all-devices"
                  checked={showAllDevices}
                  onChange={(e) => setShowAllDevices(e.target.checked)}
                  className="rounded border-border text-primary"
                />
                <label htmlFor="show-all-devices" className="text-xs text-muted-foreground cursor-pointer">
                  Show all nearby devices (debug)
                </label>
              </div>
            )}
          </div>

          {/* No devices message */}
          {devicesToShow.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              <p>No devices found.</p>
              <p className="text-xs mt-1">Try rescanning or move closer to your PMScan device.</p>
            </div>
          )}

          {/* Device list */}
          <div className="space-y-3">
            {devicesToShow.map((device) => {
              const isPreferred = preferredDevice?.deviceId === device.deviceId;
              const isPMScanDevice = filteredDevices.some(d => d.deviceId === device.deviceId);
              
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
                        <h4 className="font-medium">
                          {device.name || (isPMScanDevice ? 'PMScan Device' : 'Unknown Device')}
                        </h4>
                        {isPreferred && (
                          <Badge variant="secondary" className="text-xs">
                            Preferred
                          </Badge>
                        )}
                        {!isPMScanDevice && showAllDevices && (
                          <Badge variant="outline" className="text-xs">
                            Unfiltered
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p className="font-mono">...{device.deviceId.slice(-4)}</p>
                        {device.rssi && (
                          <p className="flex items-center gap-1">
                            <Signal className="h-3 w-3" />
                            {device.rssi} dBm
                          </p>
                        )}
                        {device.uuids && device.uuids.length > 0 && (
                          <p className="text-xs truncate">
                            UUIDs: {device.uuids.slice(0, 2).join(', ')}
                            {device.uuids.length > 2 ? '...' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <Bluetooth className="h-4 w-4 text-blue-500" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 gap-2">
          <div className="flex items-center gap-2">
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
            
            {onRescan && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRescan}
                disabled={isScanning}
                className="flex items-center gap-2"
              >
                <RotateCcw className={`h-3 w-3 ${isScanning ? 'animate-spin' : ''}`} />
                {isScanning ? 'Scanning...' : 'Rescan'}
              </Button>
            )}
          </div>
          
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