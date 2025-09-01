import { useState, useEffect } from 'react';
import { WifiOff, Wifi, CloudOff, Cloud, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';
import { offlineDataService } from '@/services/offlineDataService';
import { cn } from '@/lib/utils';

export function OfflineStatusIndicator() {
  const { isOnline, wasOffline, connectionType, lastOnlineTime, syncStatus, triggerSync } = useOfflineStatus();
  const [storageStats, setStorageStats] = useState({ totalItems: 0, unsyncedItems: 0, storageSize: 0 });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const updateStats = async () => {
      const stats = await offlineDataService.getStorageStats();
      setStorageStats(stats);
    };

    updateStats();
    const interval = setInterval(updateStats, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [syncStatus]);

  const formatStorageSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatLastOnline = (date: Date | null) => {
    if (!date) return 'Unknown';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const getStatusColor = () => {
    if (!isOnline) return 'destructive';
    if (storageStats.unsyncedItems > 0) return 'secondary';
    return 'default';
  };

  const getStatusIcon = () => {
    if (syncStatus === 'syncing') return <Loader2 className="w-3 h-3 animate-spin" />;
    if (!isOnline) return <WifiOff className="w-3 h-3" />;
    if (storageStats.unsyncedItems > 0) return <CloudOff className="w-3 h-3" />;
    return <Cloud className="w-3 h-3" />;
  };

  const getStatusText = () => {
    if (syncStatus === 'syncing') return 'Syncing...';
    if (!isOnline) return 'Offline';
    if (storageStats.unsyncedItems > 0) return `${storageStats.unsyncedItems} pending`;
    return 'Online';
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 px-2 gap-1.5 transition-colors",
            !isOnline && "text-destructive hover:text-destructive",
            storageStats.unsyncedItems > 0 && isOnline && "text-orange-600 hover:text-orange-700"
          )}
        >
          {getStatusIcon()}
          <span className="text-xs font-medium hidden sm:inline">
            {getStatusText()}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Connection Status</h4>
              <Badge variant={getStatusColor()}>
                {isOnline ? (
                  <><Wifi className="w-3 h-3 mr-1" /> Online</>
                ) : (
                  <><WifiOff className="w-3 h-3 mr-1" /> Offline</>
                )}
              </Badge>
            </div>
            
            {connectionType && (
              <p className="text-sm text-muted-foreground">
                Connection: {connectionType.toUpperCase()}
              </p>
            )}
            
            {!isOnline && lastOnlineTime && (
              <p className="text-sm text-muted-foreground">
                Last online: {formatLastOnline(lastOnlineTime)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold">Data Sync</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="font-medium">{storageStats.unsyncedItems}</p>
                <p className="text-muted-foreground">Pending items</p>
              </div>
              <div>
                <p className="font-medium">{storageStats.totalItems}</p>
                <p className="text-muted-foreground">Total stored</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Storage used: {formatStorageSize(storageStats.storageSize)}
            </p>
          </div>

          {isOnline && storageStats.unsyncedItems > 0 && (
            <Button
              onClick={triggerSync}
              disabled={syncStatus === 'syncing'}
              className="w-full"
              size="sm"
            >
              {syncStatus === 'syncing' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                'Sync Now'
              )}
            </Button>
          )}

          {!isOnline && (
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">
                You're offline. The app will continue working with cached data and sync automatically when you're back online.
              </p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}