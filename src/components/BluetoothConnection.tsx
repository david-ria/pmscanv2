import { useState } from "react";
import { Bluetooth, BluetoothOff, Battery, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUnifiedDeviceConnection } from "@/hooks/useUnifiedDeviceConnection";
import { getDeviceTypeDisplayName } from "@/lib/device/deviceDetection";
import { cn } from "@/lib/utils";

interface BluetoothConnectionProps {
  className?: string;
  preferredDeviceType?: 'pmscan' | 'airbeam';
}

export function BluetoothConnection({ className, preferredDeviceType }: BluetoothConnectionProps) {
  const [availableDevices, setAvailableDevices] = useState<any[]>([]);
  const [showDevicePicker, setShowDevicePicker] = useState(false);
  
  const { 
    isConnected, 
    isConnecting, 
    device, 
    error,
    deviceType,
    requestDevice, 
    disconnect,
    scanForDevices,
    connectToDevice
  } = useUnifiedDeviceConnection();

  const handleScanForDevices = async () => {
    try {
      const devices = await scanForDevices();
      if (devices.length > 0) {
        setAvailableDevices(devices);
        setShowDevicePicker(true);
      }
    } catch (error) {
      console.error('Failed to scan for devices:', error);
    }
  };

  const handleDeviceSelection = async (deviceInfo: any) => {
    try {
      await connectToDevice(deviceInfo);
      setShowDevicePicker(false);
      setAvailableDevices([]);
    } catch (error) {
      console.error('Failed to connect to device:', error);
    }
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          {isConnected ? (
            <Bluetooth className="h-4 w-4 text-primary" />
          ) : (
            <BluetoothOff className="h-4 w-4 text-muted-foreground" />
          )}
          Connexion {deviceType ? getDeviceTypeDisplayName(deviceType) : 'Air Quality Device'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
              {error}
            </div>
          )}
          
          {device ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{device.name}</span>
                <Badge variant={isConnected ? "default" : "secondary"}>
                  {isConnected ? "Connecté" : "Déconnecté"}
                </Badge>
              </div>
              
              {isConnected && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Battery className="h-4 w-4" />
                  <span>{device.battery}%</span>
                  {device.charging && (
                    <Badge variant="outline" className="text-xs">
                      En charge
                    </Badge>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-2">
              {preferredDeviceType 
                ? `Aucun ${getDeviceTypeDisplayName(preferredDeviceType)} connecté`
                : "Aucun appareil connecté"
              }
            </div>
          )}
          
          {!isConnected && !showDevicePicker && (
            <Button 
              onClick={handleScanForDevices}
              disabled={isConnecting}
              className="w-full"
              size="sm"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Scan for Devices
                </>
              )}
            </Button>
          )}

          {showDevicePicker && availableDevices.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Select a device:</div>
              {availableDevices.map((deviceInfo, index) => (
                <Button
                  key={index}
                  onClick={() => handleDeviceSelection(deviceInfo)}
                  variant="outline"
                  className="w-full justify-start"
                  size="sm"
                >
                  <Bluetooth className="h-4 w-4 mr-2" />
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{deviceInfo.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {getDeviceTypeDisplayName(deviceInfo.type)}
                    </span>
                  </div>
                </Button>
              ))}
              <Button
                onClick={() => setShowDevicePicker(false)}
                variant="ghost"
                size="sm"
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          )}
          
          {isConnected && (
            <Button 
              onClick={disconnect} 
              variant="outline"
              className="w-full"
              size="sm"
            >
              <BluetoothOff className="h-4 w-4 mr-2" />
              Déconnecter
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}