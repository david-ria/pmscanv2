import { useTranslation } from 'react-i18next';
import { Bluetooth, BluetoothConnected, Battery, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useActiveSensor } from '@/hooks/useActiveSensor';
import { getSensorDisplayName } from '@/lib/sensorConstants';

interface ActiveSensorStatusProps {
  className?: string;
  showConnectButton?: boolean;
  compact?: boolean;
}

export function ActiveSensorStatus({ 
  className, 
  showConnectButton = true,
  compact = false 
}: ActiveSensorStatusProps) {
  const { t } = useTranslation();
  const {
    activeSensorId,
    isConnected,
    isConnecting,
    deviceInfo,
    error,
    requestDevice,
    disconnect,
  } = useActiveSensor();

  const handleConnect = () => {
    requestDevice();
  };

  const handleDisconnect = () => {
    disconnect();
  };

  // Compact view for header/status bar
  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className || ''}`}>
        {isConnected ? (
          <>
            <BluetoothConnected className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">
              {deviceInfo?.name || getSensorDisplayName(activeSensorId)}
            </span>
            {deviceInfo && (
              <Badge variant="outline" className="text-xs">
                <Battery className="h-3 w-3 mr-1" />
                {deviceInfo.battery}%
              </Badge>
            )}
          </>
        ) : isConnecting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{t('connection.connecting')}</span>
          </>
        ) : (
          <>
            <Bluetooth className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{t('connection.notConnected')}</span>
          </>
        )}
      </div>
    );
  }

  // Full view with connect/disconnect buttons
  return (
    <div className={`flex flex-col gap-3 ${className || ''}`}>
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isConnected ? (
            <BluetoothConnected className="h-5 w-5 text-primary" />
          ) : isConnecting ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <Bluetooth className="h-5 w-5 text-muted-foreground" />
          )}
          
          <div className="flex flex-col">
            {isConnected && deviceInfo ? (
              <>
                <span className="font-medium">{deviceInfo.name}</span>
                <span className="text-xs text-muted-foreground">
                  {t('connection.decoderActive')}: {getSensorDisplayName(activeSensorId)}
                </span>
              </>
            ) : isConnecting ? (
              <span className="text-muted-foreground">{t('connection.scanning')}</span>
            ) : (
              <span className="text-muted-foreground">{t('connection.noDevice')}</span>
            )}
          </div>
        </div>

        {/* Battery indicator */}
        {isConnected && deviceInfo && (
          <div className="flex items-center gap-1">
            <Battery className={`h-4 w-4 ${deviceInfo.battery < 20 ? 'text-destructive' : 'text-muted-foreground'}`} />
            <span className={`text-sm ${deviceInfo.battery < 20 ? 'text-destructive' : ''}`}>
              {deviceInfo.battery}%
            </span>
            {deviceInfo.charging && (
              <span className="text-xs text-primary">⚡</span>
            )}
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Connect/Disconnect button */}
      {showConnectButton && (
        <div className="flex gap-2">
          {isConnected ? (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDisconnect}
              className="flex-1"
            >
              <Bluetooth className="h-4 w-4 mr-2" />
              {t('connection.disconnect')}
            </Button>
          ) : (
            <Button 
              variant="default" 
              size="sm" 
              onClick={handleConnect}
              disabled={isConnecting}
              className="flex-1"
            >
              {isConnecting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Bluetooth className="h-4 w-4 mr-2" />
              )}
              {isConnecting ? t('connection.connecting') : t('connection.connect')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
