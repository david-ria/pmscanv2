import { useEffect } from 'react';
import { toast } from '@/hooks/use-toast';

/**
 * Component that detects online/offline status and displays appropriate toasts
 * Works independently of PWA Service Worker hooks
 */
export const OfflineDetector = () => {
  useEffect(() => {
    const handleOffline = () => {
      toast({
        title: "📵 Mode hors ligne",
        description: "Vous êtes hors ligne. Certaines fonctionnalités peuvent être limitées.",
        variant: "destructive",
        duration: Infinity, // Stays visible until dismissed or back online
      });
    };

    const handleOnline = () => {
      toast({
        title: "✅ Connexion rétablie",
        description: "Vous êtes de nouveau en ligne. Synchronisation en cours...",
        duration: 3000,
      });
    };

    // Check initial state
    if (!navigator.onLine) {
      handleOffline();
    }

    // Listen for status changes
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return null; // Invisible component
};
