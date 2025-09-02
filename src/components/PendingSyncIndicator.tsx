import { useState, useEffect } from 'react';
import { FileX, RotateCcw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useTranslation } from 'react-i18next';
import { getUnsentCSVs, retryCSVSync, clearAllUnsentCSVs } from '@/hooks/useCrashRecovery';
import { toast } from 'sonner';

interface UnsentCSV {
  filename: string;
  content: string;
  timestamp: Date;
  retryCount?: number;
}

export function PendingSyncIndicator() {
  const [unsentCSVs, setUnsentCSVs] = useState<UnsentCSV[]>([]);
  const [syncing, setSyncing] = useState(false);
  const { t } = useTranslation();

  const loadUnsentCSVs = () => {
    const csvs = getUnsentCSVs();
    setUnsentCSVs(csvs);
  };

  useEffect(() => {
    loadUnsentCSVs();
    // Check for updates every 30 seconds
    const interval = setInterval(loadUnsentCSVs, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRetryCSV = async (filename: string) => {
    setSyncing(true);
    try {
      const success = await retryCSVSync(filename);
      if (success) {
        toast.success(t('sync.csvSyncSuccess', 'CSV synced successfully'));
        loadUnsentCSVs(); // Refresh the list
      } else {
        toast.error(t('sync.csvSyncFailed', 'Failed to sync CSV'));
      }
    } catch (error) {
      toast.error(t('sync.csvSyncError', 'Error syncing CSV'));
    } finally {
      setSyncing(false);
    }
  };

  const handleRetryAll = async () => {
    setSyncing(true);
    try {
      let successCount = 0;
      for (const csv of unsentCSVs) {
        const success = await retryCSVSync(csv.filename);
        if (success) successCount++;
      }
      
      if (successCount > 0) {
        toast.success(t('sync.csvBatchSuccess', `Synced ${successCount}/${unsentCSVs.length} CSV files`));
        loadUnsentCSVs();
      } else {
        toast.error(t('sync.csvBatchFailed', 'Failed to sync CSV files'));
      }
    } catch (error) {
      toast.error(t('sync.csvBatchError', 'Error syncing CSV files'));
    } finally {
      setSyncing(false);
    }
  };

  const handleClearAll = () => {
    clearAllUnsentCSVs();
    setUnsentCSVs([]);
    toast.info(t('sync.csvCleared', 'Pending CSV files cleared'));
  };

  if (unsentCSVs.length === 0) return null;

  const getStatusColor = () => {
    const highRetryCount = unsentCSVs.some(csv => (csv.retryCount || 0) > 3);
    return highRetryCount ? 'destructive' : 'secondary';
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="flex items-center gap-2 relative"
          disabled={syncing}
        >
          {syncing ? (
            <RotateCcw className="h-4 w-4 animate-spin" />
          ) : (
            <FileX className="h-4 w-4" />
          )}
          <Badge variant={getStatusColor()} className="h-5 px-1.5 text-xs">
            {unsentCSVs.length}
          </Badge>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="px-3 py-2 border-b">
          <h4 className="font-medium text-sm">
            {t('sync.pendingCSVTitle', 'Pending CSV Files')}
          </h4>
          <p className="text-xs text-muted-foreground">
            {t('sync.pendingCSVDesc', 'These files are waiting to be synced')}
          </p>
        </div>
        
        <div className="max-h-60 overflow-y-auto">
          {unsentCSVs.map((csv) => (
            <DropdownMenuItem key={csv.filename} className="flex-col items-start p-3">
              <div className="flex items-center justify-between w-full">
                <span className="text-sm font-medium truncate max-w-48">
                  {csv.filename}
                </span>
                {(csv.retryCount || 0) > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {csv.retryCount} {t('sync.retries', 'retries')}
                  </Badge>
                )}
              </div>
              <div className="flex items-center justify-between w-full mt-1">
                <span className="text-xs text-muted-foreground">
                  {csv.timestamp.toLocaleString()}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRetryCSV(csv.filename);
                  }}
                  disabled={syncing}
                  className="h-6 px-2 text-xs"
                >
                  {t('sync.retry', 'Retry')}
                </Button>
              </div>
            </DropdownMenuItem>
          ))}
        </div>

        <DropdownMenuSeparator />
        
        <div className="p-2 space-y-1">
          <Button
            size="sm"
            variant="outline"
            onClick={handleRetryAll}
            disabled={syncing || !navigator.onLine}
            className="w-full justify-start text-xs"
          >
            <RotateCcw className="h-3 w-3 mr-2" />
            {t('sync.retryAll', 'Retry All')}
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={handleClearAll}
            disabled={syncing}
            className="w-full justify-start text-xs text-muted-foreground"
          >
            <AlertTriangle className="h-3 w-3 mr-2" />
            {t('sync.clearAll', 'Clear All')}
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}