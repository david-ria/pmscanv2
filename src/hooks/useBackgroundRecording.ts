import { useState, useEffect, useRef, useCallback } from 'react';
import { PMScanData } from '@/lib/pmscan/types';
import { LocationData } from '@/types/PMScan';

interface BackgroundRecordingOptions {
  enableWakeLock: boolean;
  enableNotifications: boolean;
  syncInterval: number; // in milliseconds
}

export function useBackgroundRecording() {
  const [isBackgroundEnabled, setIsBackgroundEnabled] = useState(false);
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);
  const [serviceWorkerRegistration, setServiceWorkerRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [backgroundSyncSupported, setBackgroundSyncSupported] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize service worker and check capabilities
  useEffect(() => {
    initializeServiceWorker();
    checkBackgroundSyncSupport();
    checkNotificationPermission();
  }, []);

  const initializeServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        setServiceWorkerRegistration(registration);
        console.log('🔧 Service Worker registered successfully');

        // Listen for service worker messages
        navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);

        await navigator.serviceWorker.ready;
        console.log('🚀 Service Worker ready');
      } catch (error) {
        console.error('❌ Service Worker registration failed:', error);
      }
    }
  };

  const handleServiceWorkerMessage = (event: MessageEvent) => {
    console.log('📨 Received message from Service Worker:', event.data);
    
    switch (event.data.type) {
      case 'BACKGROUND_SYNC_RUNNING':
        console.log('🔄 Background sync is running...');
        break;
      case 'BACKGROUND_SYNC_COMPLETE':
        console.log(`✅ Background sync completed. Processed ${event.data.processedCount} data points`);
        break;
      case 'BACKGROUND_SYNC_ERROR':
        console.error('❌ Background sync error:', event.data.error);
        showNotification('PMScan Error', 'Background data collection failed. Please check the app.');
        break;
      case 'SYNC_PENDING_MISSIONS':
        console.log('🔄 Syncing pending missions...');
        // This would trigger the actual sync logic in the main app
        break;
    }
  };

  const checkBackgroundSyncSupport = () => {
    const isSupported = 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype;
    setBackgroundSyncSupported(isSupported);
    console.log('🔄 Background Sync supported:', isSupported);
  };

  const checkNotificationPermission = async () => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  };

  const requestNotificationPermission = async (): Promise<boolean> => {
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
  };

  const acquireWakeLock = async (): Promise<boolean> => {
    if (!('wakeLock' in navigator)) {
      console.warn('⚠️ Wake Lock API not supported');
      return false;
    }

    try {
      const wakeLockSentinel = await navigator.wakeLock.request('screen');
      setWakeLock(wakeLockSentinel);
      
      wakeLockSentinel.addEventListener('release', () => {
        console.log('🔋 Wake lock was released');
        setWakeLock(null);
      });

      console.log('🔋 Wake lock acquired');
      return true;
    } catch (error) {
      console.error('❌ Wake lock request failed:', error);
      return false;
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLock) {
      try {
        await wakeLock.release();
        setWakeLock(null);
        console.log('🔋 Wake lock released');
      } catch (error) {
        console.error('❌ Wake lock release failed:', error);
      }
    }
  };

  const enableBackgroundRecording = async (options: BackgroundRecordingOptions = {
    enableWakeLock: true,
    enableNotifications: true,
    syncInterval: 30000 // 30 seconds
  }): Promise<boolean> => {
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
            type: 'SCHEDULE_BACKGROUND_SYNC'
          });
          console.log('🔄 Background sync scheduled');
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
            type: 'SCHEDULE_BACKGROUND_SYNC'
          });
        }
      }, options.syncInterval);

      setIsBackgroundEnabled(true);
      console.log('🎯 Background recording enabled');
      
      showNotification('PMScan Background Active', 'Data collection will continue in the background');
      return true;
    } catch (error) {
      console.error('❌ Failed to enable background recording:', error);
      return false;
    }
  };

  const disableBackgroundRecording = async () => {
    try {
      // Release wake lock
      await releaseWakeLock();

      // Clear sync interval
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }

      setIsBackgroundEnabled(false);
      console.log('🛑 Background recording disabled');
      
      showNotification('PMScan Background Stopped', 'Background data collection has been disabled');
    } catch (error) {
      console.error('❌ Failed to disable background recording:', error);
    }
  };

  const storeDataForBackground = useCallback((pmData: PMScanData, location?: LocationData, context?: any) => {
    if (!serviceWorkerRegistration || !isBackgroundEnabled) return;

    // Send data to service worker for background storage
    navigator.serviceWorker.controller?.postMessage({
      type: 'STORE_BACKGROUND_DATA',
      payload: {
        pmData,
        location,
        context,
        timestamp: Date.now()
      }
    });
  }, [serviceWorkerRegistration, isBackgroundEnabled]);

  const showNotification = (title: string, body: string) => {
    if (notificationPermission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico'
      });
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
      releaseWakeLock();
    };
  }, []);

  return {
    isBackgroundEnabled,
    backgroundSyncSupported,
    notificationPermission,
    wakeLock: !!wakeLock,
    enableBackgroundRecording,
    disableBackgroundRecording,
    storeDataForBackground,
    requestNotificationPermission
  };
}
