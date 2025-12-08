import { useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { dataStorage } from '@/lib/dataStorage';
import * as logger from '@/utils/logger';

/**
 * Component that detects online/offline status and displays appropriate toasts
 * Works independently of PWA Service Worker hooks
 */
export const OfflineDetector = () => {
  const { t } = useTranslation();

  useEffect(() => {
    logger.debug('[OfflineDetector] Component mounted, navigator.onLine:', navigator.onLine);
    
    const handleOffline = () => {
      logger.debug('[OfflineDetector] Offline event triggered');
      toast({
        title: t('offline.title'),
        description: t('offline.description'),
        variant: "destructive",
        duration: Infinity, // Stays visible until dismissed or back online
      });
    };

    const handleOnline = () => {
      logger.debug('[OfflineDetector] Online event triggered');
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
            logger.debug('Auto-sync completed successfully');
          } catch (error) {
            logger.error('Auto-sync failed:', error);
          }
        }
      }, 2000);
    };

    // Check initial state
    if (!navigator.onLine) {
      logger.debug('[OfflineDetector] Initial state: offline, showing toast');
      handleOffline();
    } else {
      logger.debug('[OfflineDetector] Initial state: online');
    }

    // Listen for status changes
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      logger.debug('[OfflineDetector] Component unmounting');
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return null; // Invisible component
};
