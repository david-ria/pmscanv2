import { Bluetooth, BluetoothOff, Battery, Loader2 } from "lucide-react";
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
  const { 
    isConnected, 
    isConnecting, 
    device, 
    error,
    deviceType,
    requestDevice, 
    disconnect 
  } = useUnifiedDeviceConnection();

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
          
          {!isConnected && (
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground">Select device type:</div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => requestDevice('pmscan')} 
                  disabled={isConnecting}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Bluetooth className="h-4 w-4 mr-2" />
                      PMScan
                    </>
                  )}
                </Button>
                <Button 
                  onClick={() => requestDevice('airbeam')} 
                  disabled={isConnecting}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Bluetooth className="h-4 w-4 mr-2" />
                      AirBeam
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
          
          {isConnected && (
            <Button 
              onClick={disconnect} 
              variant="outline"
              className="flex-1"
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