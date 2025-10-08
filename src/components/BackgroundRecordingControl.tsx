import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Moon,
  Sun,
  Smartphone,
  Wifi,
  Bell,
  BatteryLow,
  Shield,
  PlayCircle,
} from 'lucide-react';
import { useBackgroundRecording } from '@/hooks/useBackgroundRecording';
import { useBackgroundRecordingIntegration } from '@/hooks/useBackgroundRecordingIntegration';
import { useUnifiedData } from '@/components/UnifiedDataProvider';
import {
  setBackgroundRecording,
  getBackgroundRecording,
} from '@/lib/pmscan/globalConnectionManager';
import { useToast } from '@/hooks/use-toast';

export function BackgroundRecordingControl() {
  const [isBackgroundMode, setIsBackgroundMode] = useState(
    getBackgroundRecording()
  );
  const { toast } = useToast();

  const {
    isBackgroundEnabled,
    backgroundSyncSupported,
    notificationPermission,
    wakeLock,
    enableBackgroundRecording,
    disableBackgroundRecording,
    requestNotificationPermission,
  } = useBackgroundRecording();

  const { isNative, platform, nativeStatus } = useBackgroundRecordingIntegration();

  const { isRecording } = useUnifiedData();

  const handleBackgroundToggle = async (enabled: boolean) => {
    setIsBackgroundMode(enabled);
    setBackgroundRecording(enabled);

    if (enabled) {
      if (!backgroundSyncSupported) {
        toast({
          title: 'Background Sync Unavailable',
          description:
            "Your browser doesn't support background sync. Data will only be recorded when the app is active.",
          variant: 'destructive',
        });
        return;
      }

      // Request notification permission if needed
      if (notificationPermission !== 'granted') {
        const granted = await requestNotificationPermission();
        if (!granted) {
          toast({
            title: 'Notifications Disabled',
            description:
              'Enable notifications to get alerts if background recording stops.',
            variant: 'destructive',
          });
        }
      }

      // Enable background recording features
      await enableBackgroundRecording({
        enableWakeLock: true,
        enableNotifications: true,
        syncInterval: 30000,
      });

      toast({
        title: 'Background Mode Enabled',
        description:
          'PMScan will continue recording even when the app is in the background.',
      });
    } else {
      await disableBackgroundRecording();

      toast({
        title: 'Background Mode Disabled',
        description: 'Recording will pause when the app is in the background.',
      });
    }
  };

  const getStatusColor = (condition: boolean) =>
    condition ? 'text-green-600' : 'text-red-600';
  const getStatusIcon = (condition: boolean) => (condition ? '✅' : '❌');

  return (
    <Card className="mb-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Moon className="h-5 w-5" />
            Background Recording
          </CardTitle>
          <Badge variant={isBackgroundMode ? 'default' : 'secondary'}>
            {isBackgroundMode ? 'Active' : 'Disabled'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Main Toggle */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center gap-3">
            <Smartphone className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">Background Mode</p>
              <p className="text-sm text-muted-foreground">
                Continue recording when app is minimized
              </p>
            </div>
          </div>
          <Switch
            checked={isBackgroundMode}
            onCheckedChange={handleBackgroundToggle}
            disabled={!backgroundSyncSupported}
          />
        </div>

        {/* Native Mode Indicator */}
        {isNative && (
          <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">
                Native Mode ({platform})
              </span>
              <Badge variant={nativeStatus.isNativeSupported ? 'default' : 'secondary'}>
                {nativeStatus.isNativeSupported ? 'Available' : 'Unavailable'}
              </Badge>
            </div>
          </div>
        )}

        {/* Status Indicators */}
        {isBackgroundMode && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            {isNative && nativeStatus.isNativeSupported && (
              <div className="flex items-center gap-2 p-2 border rounded">
                <PlayCircle
                  className={`h-4 w-4 ${nativeStatus.isNativeActive ? 'text-green-500' : 'text-gray-500'}`}
                />
                <span className={getStatusColor(nativeStatus.isNativeActive)}>
                  Native {getStatusIcon(nativeStatus.isNativeActive)}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 p-2 border rounded">
              <Wifi
                className={`h-4 w-4 ${backgroundSyncSupported ? 'text-green-500' : 'text-red-500'}`}
              />
              <span className={getStatusColor(backgroundSyncSupported)}>
                PWA Sync {getStatusIcon(backgroundSyncSupported)}
              </span>
            </div>

            <div className="flex items-center gap-2 p-2 border rounded">
              <Bell
                className={`h-4 w-4 ${notificationPermission === 'granted' ? 'text-green-500' : 'text-amber-500'}`}
              />
              <span
                className={getStatusColor(notificationPermission === 'granted')}
              >
                Notifications{' '}
                {getStatusIcon(notificationPermission === 'granted')}
              </span>
            </div>

            <div className="flex items-center gap-2 p-2 border rounded">
              <BatteryLow
                className={`h-4 w-4 ${wakeLock ? 'text-green-500' : 'text-amber-500'}`}
              />
              <span className={getStatusColor(wakeLock)}>
                Wake Lock {getStatusIcon(wakeLock)}
              </span>
            </div>

            <div className="flex items-center gap-2 p-2 border rounded">
              <Shield
                className={`h-4 w-4 ${isBackgroundEnabled ? 'text-green-500' : 'text-gray-500'}`}
              />
              <span className={getStatusColor(isBackgroundEnabled)}>
                Background Active {getStatusIcon(isBackgroundEnabled)}
              </span>
            </div>
          </div>
        )}

        {/* Compatibility Info */}
        {!backgroundSyncSupported && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>Limited Support:</strong> Your browser doesn't support
              background sync. Recording will pause when the app is closed or
              minimized.
            </p>
          </div>
        )}

        {/* Recording Status */}
        {isRecording && isBackgroundMode && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <p className="text-sm text-blue-800">
                <strong>Background Recording Active:</strong> Your PMScan data
                is being collected even when the app is in the background.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
