import { useEffect } from 'react';
import { dataStorage } from '@/lib/dataStorage';

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

  // Sync on app load if online (only once)
  useEffect(() => {
    if (navigator.onLine) {
      const timeoutId = setTimeout(() => {
        dataStorage.syncPendingMissions().catch(console.error);
      }, 3000); // Delay initial sync to let app load

      return () => clearTimeout(timeoutId);
    }
  }, []); // Empty dependency array ensures this runs only once
}
