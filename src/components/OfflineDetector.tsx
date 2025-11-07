import { useEffect } from 'react';
import { toast } from '@/hooks/use-toast';

/**
 * Component that detects online/offline status and displays appropriate toasts
 * Works independently of PWA Service Worker hooks
 */
export const OfflineDetector = () => {
  useEffect(() => {
    console.log('[OfflineDetector] Component mounted, navigator.onLine:', navigator.onLine);
    
    const handleOffline = () => {
      console.log('[OfflineDetector] Offline event triggered');
      toast({
        title: "📵 Mode hors ligne",
        description: "Vous êtes hors ligne. Certaines fonctionnalités peuvent être limitées.",
        variant: "destructive",
        duration: Infinity, // Stays visible until dismissed or back online
      });
    };

    const handleOnline = () => {
      console.log('[OfflineDetector] Online event triggered');
      toast({
        title: "✅ Connexion rétablie",
        description: "Vous êtes de nouveau en ligne. Synchronisation en cours...",
        duration: 3000,
      });
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
