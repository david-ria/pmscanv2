/**
 * Storage Monitor Component
 * 
 * Monitors storage usage and alerts user when approaching limits
 */

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { hybridStorage } from '@/services/hybridStorageService';
import logger from '@/utils/logger';

const STORAGE_WARNING_THRESHOLD = 80; // Alert at 80%
const STORAGE_CRITICAL_THRESHOLD = 90; // Critical alert at 90%
const CHECK_INTERVAL = 60000; // Check every minute

export function StorageMonitor() {
  const [hasWarned, setHasWarned] = useState(false);

  useEffect(() => {
    const checkStorage = async () => {
      try {
        const stats = await hybridStorage.getStorageStats();
        const percentUsed = stats.percentUsed;

        logger.debug('Storage usage', {
          localStorage: `${(stats.localStorage / 1024).toFixed(2)} KB`,
          indexedDB: `${(stats.indexedDB / 1024 / 1024).toFixed(2)} MB`,
          total: `${(stats.total / 1024 / 1024).toFixed(2)} MB`,
          quota: `${(stats.quota / 1024 / 1024).toFixed(2)} MB`,
          percentUsed: `${percentUsed.toFixed(1)}%`,
        });

        // Critical alert
        if (percentUsed >= STORAGE_CRITICAL_THRESHOLD && !hasWarned) {
          toast.error('Espace de stockage critique !', {
            description: `${percentUsed.toFixed(0)}% utilisé. Synchronisez ou supprimez des missions.`,
            duration: 10000,
          });
          setHasWarned(true);
        }
        // Warning alert
        else if (percentUsed >= STORAGE_WARNING_THRESHOLD && !hasWarned) {
          toast.warning('Espace de stockage bientôt saturé', {
            description: `${percentUsed.toFixed(0)}% utilisé. Pensez à synchroniser vos données.`,
            duration: 7000,
          });
          setHasWarned(true);
        }
        // Reset warning flag when usage drops
        else if (percentUsed < STORAGE_WARNING_THRESHOLD && hasWarned) {
          setHasWarned(false);
        }
      } catch (error) {
        logger.error('Failed to check storage', error);
      }
    };

    // Initial check
    checkStorage();

    // Periodic checks
    const interval = setInterval(checkStorage, CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [hasWarned]);

  // This component doesn't render anything visible
  return null;
}
