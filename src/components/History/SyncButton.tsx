import { RotateCcw, WifiOff, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { cleanupOrphanedMissions } from '@/lib/syncUtils';
import { toast } from 'sonner';

interface SyncButtonProps {
  unsyncedCount: number;
  syncing: boolean;
  onSync: () => void;
}

export function SyncButton({
  unsyncedCount,
  syncing,
  onSync,
}: SyncButtonProps) {
  const { t } = useTranslation();

  const handleCleanupOrphaned = async () => {
    try {
      const cleanedCount = await cleanupOrphanedMissions();
      if (cleanedCount > 0) {
        toast.success(`Cleaned up ${cleanedCount} orphaned missions`);
        onSync(); // Refresh after cleanup
      } else {
        toast.info('No orphaned missions found');
      }
    } catch (error) {
      toast.error('Failed to cleanup orphaned missions');
    }
  };

  if (unsyncedCount === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onSync}
        disabled={syncing || !navigator.onLine}
        className="flex items-center gap-2"
      >
        {syncing ? (
          <RotateCcw className="h-4 w-4 animate-spin" />
        ) : navigator.onLine ? (
          <RotateCcw className="h-4 w-4" />
        ) : (
          <WifiOff className="h-4 w-4" />
        )}
        {t('history.sync')} ({unsyncedCount})
      </Button>
      
      {navigator.onLine && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCleanupOrphaned}
          disabled={syncing}
          className="flex items-center gap-2"
          title="Clean up orphaned missions"
        >
          <AlertTriangle className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
