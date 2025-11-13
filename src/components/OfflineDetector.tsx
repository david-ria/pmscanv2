import { useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { dataStorage } from '@/lib/dataStorage';

/**
 * Component that detects online/offline status and displays appropriate toasts
 * Works independently of PWA Service Worker hooks
 */
export const OfflineDetector = () => {
  const { t } = useTranslation();

  useEffect(() => {
    console.log('[OfflineDetector] Component mounted, navigator.onLine:', navigator.onLine);
    
    const handleOffline = () => {
      console.log('[OfflineDetector] Offline event triggered');
      toast({
        title: t('offline.title'),
        description: t('offline.description'),
        variant: "destructive",
        duration: Infinity, // Stays visible until dismissed or back online
      });
    };

    const handleOnline = () => {
      console.log('[OfflineDetector] Online event triggered');
      toast({
        title: t('online.title'),
        description: t('online.description'),
        duration: 3000,
      });

      // Auto-sync pending missions after 2 seconds (silent)
      setTimeout(async () => {
        if (navigator.onLine) {
          try {
            await dataStorage.syncPendingMissions();
            console.log('✅ Auto-sync completed successfully');
          } catch (error) {
            console.error('❌ Auto-sync failed:', error);
          }
        }
      }, 2000);
    };

    // Check initial state
    if (!navigator.onLine) {
      console.log('[OfflineDetector] Initial state: offline, showing toast');
      handleOffline();
    } else {
      console.log('[OfflineDetector] Initial state: online');
    }

    // Listen for status changes
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      console.log('[OfflineDetector] Component unmounting');
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return null; // Invisible component
};
