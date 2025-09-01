import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export interface OfflineStatus {
  isOnline: boolean;
  wasOffline: boolean;
  connectionType: string | null;
  lastOnlineTime: Date | null;
  syncStatus: 'idle' | 'syncing' | 'failed' | 'success';
}

export function useOfflineStatus() {
  const [status, setStatus] = useState<OfflineStatus>({
    isOnline: navigator.onLine,
    wasOffline: false,
    connectionType: getConnectionType(),
    lastOnlineTime: navigator.onLine ? new Date() : null,
    syncStatus: 'idle'
  });

  useEffect(() => {
    const handleOnline = () => {
      const now = new Date();
      setStatus(prev => ({
        ...prev,
        isOnline: true,
        lastOnlineTime: now,
        connectionType: getConnectionType()
      }));

      if (status.wasOffline) {
        toast.success('Back online! Syncing data...', {
          duration: 3000,
          id: 'connection-restored'
        });
        triggerBackgroundSync();
      }
    };

    const handleOffline = () => {
      setStatus(prev => ({
        ...prev,
        isOnline: false,
        wasOffline: true,
        connectionType: null
      }));

      toast.warning('You\'re offline. The app will continue working with cached data.', {
        duration: 5000,
        id: 'connection-lost'
      });
    };

    const handleConnectionChange = () => {
      setStatus(prev => ({
        ...prev,
        connectionType: getConnectionType()
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Listen for connection type changes
    if ('connection' in navigator) {
      (navigator as any).connection?.addEventListener('change', handleConnectionChange);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if ('connection' in navigator) {
        (navigator as any).connection?.removeEventListener('change', handleConnectionChange);
      }
    };
  }, [status.wasOffline]);

  const triggerBackgroundSync = async () => {
    setStatus(prev => ({ ...prev, syncStatus: 'syncing' }));
    
    try {
      // Register background sync if service worker is available
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('background-sync-air-quality');
        await registration.sync.register('background-sync-missions');
        
        setStatus(prev => ({ ...prev, syncStatus: 'success' }));
        toast.success('Data synced successfully!');
      }
    } catch (error) {
      console.error('Background sync failed:', error);
      setStatus(prev => ({ ...prev, syncStatus: 'failed' }));
      toast.error('Sync failed. Will retry automatically.');
    }
  };

  return {
    ...status,
    triggerSync: triggerBackgroundSync
  };
}

function getConnectionType(): string | null {
  if ('connection' in navigator) {
    const connection = (navigator as any).connection;
    return connection?.effectiveType || connection?.type || null;
  }
  return null;
}