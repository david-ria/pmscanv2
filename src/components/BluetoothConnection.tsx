import { Bluetooth, BluetoothOff, Battery, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePMScanBluetooth } from '@/hooks/usePMScanBluetooth';
import { cn } from '@/lib/utils';

interface BluetoothConnectionProps {
  className?: string;
}

export function BluetoothConnection({ className }: BluetoothConnectionProps) {
  const {
    isConnected,
    isConnecting,
    device,
    error,
    requestDevice,
    disconnect,
  } = usePMScanBluetooth();

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          {isConnected ? (
            <Bluetooth className="h-4 w-4 text-primary" />
          ) : (
            <BluetoothOff className="h-4 w-4 text-muted-foreground" />
          )}
          Connexion PMScan
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
                <Badge variant={isConnected ? 'default' : 'secondary'}>
                  {isConnected ? 'Connecté' : 'Déconnecté'}
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
              Aucun appareil connecté
            </div>
          )}

          <div className="flex gap-2">
            {!isConnected ? (
              <Button
                onClick={requestDevice}
                disabled={isConnecting}
                className="flex-1"
                size="sm"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connexion...
                  </>
                ) : (
                  <>
                    <Bluetooth className="h-4 w-4 mr-2" />
                    Connecter
                  </>
                )}
              </Button>
            ) : (
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
        </div>
      </CardContent>
    </Card>
  );
}
