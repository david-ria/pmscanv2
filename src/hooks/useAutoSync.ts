import { useEffect } from 'react';
import { dataStorage } from '@/lib/dataStorage';
import * as logger from '@/utils/logger';

export function useAutoSync() {
  // Auto-sync when coming online (debounced)
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const handleOnline = () => {
      // Debounce to prevent multiple rapid online events
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        dataStorage.syncPendingMissions().catch(console.error);
      }, 2000);
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
      clearTimeout(timeoutId);
    };
  }, []);

  // Disable initial sync on app load to reduce sync spam
  useEffect(() => {
    // Skip initial sync to prevent excessive syncing
    logger.debug('🚫 Skipping initial sync to reduce sync frequency');
  }, []);
}
