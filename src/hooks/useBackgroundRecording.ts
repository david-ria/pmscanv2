import { useState, useEffect, useRef, useCallback } from 'react';
import { PMScanData } from '@/lib/pmscan/types';
import { LocationData } from '@/types/PMScan';
import * as logger from '@/utils/logger';
import { isTestMode, logTestModeDisabled } from '@/utils/testMode';

interface BackgroundRecordingOptions {
  enableWakeLock: boolean;
  enableNotifications: boolean;
  syncInterval: number; // in milliseconds
}

export function useBackgroundRecording() {
  const [isBackgroundEnabled, setIsBackgroundEnabled] = useState(() => {
    const stored = localStorage.getItem('pmscan-background-enabled');
    return stored ? JSON.parse(stored) : false;
  });
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);
  const [serviceWorkerRegistration, setServiceWorkerRegistration] =
    useState<ServiceWorkerRegistration | null>(null);
  const [backgroundSyncSupported, setBackgroundSyncSupported] = useState(false);
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission>('default');

  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const showNotification = useCallback((title: string, body: string) => {
    if (notificationPermission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
      });
    }
  }, [notificationPermission]);

  const handleServiceWorkerMessage = useCallback((event: MessageEvent) => {
    logger.debug('📨 Received message from Service Worker:', event.data);

    switch (event.data.type) {
      case 'BACKGROUND_SYNC_RUNNING':
        logger.debug('🔄 Background sync is running...');
        break;
      case 'BACKGROUND_SYNC_COMPLETE':
        logger.debug(
          `✅ Background sync completed. Processed ${event.data.processedCount} data points`
        );
        break;
      case 'BACKGROUND_SYNC_ERROR':
        console.error('❌ Background sync error:', event.data.error);
        showNotification(
          'PMScan Error',
          'Background data collection failed. Please check the app.'
        );
        break;
      case 'SYNC_PENDING_MISSIONS':
        logger.debug('🔄 Syncing pending missions...');
        // This would trigger the actual sync logic in the main app
        break;
    }
  }, [showNotification]);

  const initializeServiceWorker = useCallback(async () => {
    if (isTestMode()) {
      logTestModeDisabled('Service Worker registration');
      return;
    }
    
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        setServiceWorkerRegistration(registration);
        logger.debug('🔧 Service Worker registered successfully');

        await navigator.serviceWorker.ready;
        logger.debug('🚀 Service Worker ready');
      } catch (error) {
        console.error('❌ Service Worker registration failed:', error);
      }
    }
  }, []);

  const checkBackgroundSyncSupport = useCallback(() => {
    if (isTestMode()) {
      logTestModeDisabled('Background Sync check');
      setBackgroundSyncSupported(false);
      return;
    }
    
    const isSupported =
      'serviceWorker' in navigator &&
      'sync' in window.ServiceWorkerRegistration.prototype;
    setBackgroundSyncSupported(isSupported);
    logger.debug('🔄 Background Sync supported:', isSupported);
  }, []);

  const checkNotificationPermission = useCallback(async () => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Initialize service worker and check capabilities
  useEffect(() => {
    initializeServiceWorker();
    checkBackgroundSyncSupport();
    checkNotificationPermission();
    
    // Listen for service worker messages after initialization
    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, [initializeServiceWorker, checkBackgroundSyncSupport, checkNotificationPermission, handleServiceWorkerMessage]);

  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.warn('⚠️ Notifications not supported');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    return permission === 'granted';
  }, []);

  const acquireWakeLock = useCallback(async (): Promise<boolean> => {
    if (!('wakeLock' in navigator)) {
      console.warn('⚠️ Wake Lock API not supported');
      return false;
    }

    try {
      const wakeLockSentinel = await navigator.wakeLock.request('screen');
      setWakeLock(wakeLockSentinel);

      wakeLockSentinel.addEventListener('release', () => {
        logger.debug('🔋 Wake lock was released');
        setWakeLock(null);
      });

      logger.debug('🔋 Wake lock acquired');
      return true;
    } catch (error) {
      console.error('❌ Wake lock request failed:', error);
      return false;
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLock) {
      try {
        await wakeLock.release();
        setWakeLock(null);
        logger.debug('🔋 Wake lock released');
      } catch (error) {
        console.error('❌ Wake lock release failed:', error);
      }
    }
  }, [wakeLock]);

  const enableBackgroundRecording = useCallback(async (
    options: BackgroundRecordingOptions = {
      enableWakeLock: true,
      enableNotifications: true,
      syncInterval: 30000, // 30 seconds
    }
  ): Promise<boolean> => {
    try {
      // Request notification permission if needed
      if (options.enableNotifications) {
        const notificationGranted = await requestNotificationPermission();
        if (!notificationGranted) {
          console.warn('⚠️ Notification permission denied');
        }
      }

      // Acquire wake lock if needed
      if (options.enableWakeLock) {
        await acquireWakeLock();
      }

      // Schedule background sync
      if (backgroundSyncSupported && serviceWorkerRegistration) {
        try {
          // Use service worker message to schedule sync
          navigator.serviceWorker.controller?.postMessage({
            type: 'SCHEDULE_BACKGROUND_SYNC',
          });
          logger.debug('🔄 Background sync scheduled');
        } catch (error) {
          console.error('❌ Failed to schedule background sync:', error);
        }
      }

      // Set up periodic sync interval
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }

      syncIntervalRef.current = setInterval(() => {
        if (serviceWorkerRegistration && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'SCHEDULE_BACKGROUND_SYNC',
          });
        }
      }, options.syncInterval);

      setIsBackgroundEnabled(true);
      localStorage.setItem('pmscan-background-enabled', 'true');
      logger.debug('🎯 Background recording enabled');

      showNotification(
        'PMScan Background Active',
        'Data collection will continue in the background'
      );
      return true;
    } catch (error) {
      console.error('❌ Failed to enable background recording:', error);
      return false;
    }
  }, [requestNotificationPermission, acquireWakeLock, backgroundSyncSupported, serviceWorkerRegistration, showNotification]);

  const disableBackgroundRecording = useCallback(async () => {
    try {
      // Release wake lock
      await releaseWakeLock();

      // Clear sync interval
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }

      setIsBackgroundEnabled(false);
      localStorage.setItem('pmscan-background-enabled', 'false');
      logger.debug('🛑 Background recording disabled');

      showNotification(
        'PMScan Background Stopped',
        'Background data collection has been disabled'
      );
    } catch (error) {
      console.error('❌ Failed to disable background recording:', error);
    }
  }, [releaseWakeLock, showNotification]);

  const storeDataForBackground = useCallback(
    (pmData: PMScanData, location?: LocationData, context?: { weatherDataId?: string; [key: string]: unknown }) => {
      if (!serviceWorkerRegistration || !isBackgroundEnabled) return;

      // Send data to service worker for background storage
      navigator.serviceWorker.controller?.postMessage({
        type: 'STORE_BACKGROUND_DATA',
        payload: {
          pmData,
          location,
          context,
          timestamp: Date.now(),
        },
      });
    },
    [serviceWorkerRegistration, isBackgroundEnabled]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
      releaseWakeLock();
    };
  }, [releaseWakeLock]);

  return {
    isBackgroundEnabled,
    backgroundSyncSupported,
    notificationPermission,
    wakeLock: !!wakeLock,
    enableBackgroundRecording,
    disableBackgroundRecording,
    storeDataForBackground,
    requestNotificationPermission,
  };
}