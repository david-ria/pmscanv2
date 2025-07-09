import { Shield, Wifi, Bell, BatteryLow } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useBackgroundRecording } from "@/hooks/useBackgroundRecording";
import { useRecordingContext } from "@/contexts/RecordingContext";

export function BackgroundRecordingStatus() {
  const { 
    isBackgroundEnabled, 
    backgroundSyncSupported, 
    notificationPermission, 
    wakeLock 
  } = useBackgroundRecording();
  const { isRecording } = useRecordingContext();

  if (!isRecording) return null;

  return (
    <Card className="mb-4 border-primary/20 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Background Recording Status
          </h3>
          <Badge variant={isBackgroundEnabled ? "default" : "secondary"}>
            {isBackgroundEnabled ? "Active" : "Inactive"}
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Wifi className={`h-3 w-3 ${backgroundSyncSupported ? 'text-green-500' : 'text-red-500'}`} />
            <span className={backgroundSyncSupported ? 'text-green-700' : 'text-red-700'}>
              Background Sync
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Bell className={`h-3 w-3 ${notificationPermission === 'granted' ? 'text-green-500' : 'text-amber-500'}`} />
            <span className={notificationPermission === 'granted' ? 'text-green-700' : 'text-amber-700'}>
              Notifications
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <BatteryLow className={`h-3 w-3 ${wakeLock ? 'text-green-500' : 'text-amber-500'}`} />
            <span className={wakeLock ? 'text-green-700' : 'text-amber-700'}>
              Wake Lock
            </span>
          </div>
          
          <div className="text-muted-foreground">
            Keeps recording when app is backgrounded
          </div>
        </div>
      </CardContent>
    </Card>
  );
}