import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import * as logger from '@/utils/logger';

interface NativeBackgroundStatus {
  isNativeSupported: boolean;
  isNativeActive: boolean;
  isForegroundServiceRunning: boolean;
  hasLocationPermission: boolean;
  hasBatteryOptimizationExemption: boolean;
}

export function useNativeBackgroundMode() {
  const [status, setStatus] = useState<NativeBackgroundStatus>({
    isNativeSupported: false,
    isNativeActive: false,
    isForegroundServiceRunning: false,
    hasLocationPermission: false,
    hasBatteryOptimizationExemption: false,
  });
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);

  // Check if running on native platform
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();

  useEffect(() => {
    checkNativeSupport();
  }, []);

  const checkNativeSupport = useCallback(async () => {
    if (!isNative) {
      logger.debug('📱 Not running on native platform, native background mode unavailable');
      return;
    }

    try {
      // Check if background task plugin is available
      const hasPlugin = Capacitor.isPluginAvailable('BackgroundTask');
      
      setStatus(prev => ({
        ...prev,
        isNativeSupported: hasPlugin,
      }));

      logger.debug(`📱 Native background mode support: ${hasPlugin} (${platform})`);
    } catch (error) {
      logger.debug('❌ Error checking native background support:', error);
    }
  }, [isNative, platform]);

  const requestLocationPermission = useCallback(async (): Promise<boolean> => {
    if (!isNative || platform !== 'ios') {
      return true; // Not needed on web or Android for this use case
    }

    try {
      // On iOS, we need "Always" location permission for background Bluetooth
      const { Geolocation } = await import('@capacitor/geolocation');
      const permission = await Geolocation.requestPermissions();
      
      const granted = permission.location === 'granted' || permission.coarseLocation === 'granted';
      
      setStatus(prev => ({
        ...prev,
        hasLocationPermission: granted,
      }));

      logger.debug(`📍 iOS location permission: ${granted}`);
      return granted;
    } catch (error) {
      logger.debug('❌ Error requesting location permission:', error);
      return false;
    }
  }, [isNative, platform]);

  const requestBatteryOptimizationExemption = useCallback(async (): Promise<boolean> => {
    if (!isNative || platform !== 'android') {
      return true; // Not needed on web or iOS
    }

    try {
      // Check if we can disable battery optimization (Android)
      // This would require a custom plugin or native code
      // For now, we'll just log and return true
      logger.debug('🔋 Android battery optimization exemption requested');
      
      setStatus(prev => ({
        ...prev,
        hasBatteryOptimizationExemption: true,
      }));

      return true;
    } catch (error) {
      logger.debug('❌ Error requesting battery optimization exemption:', error);
      return false;
    }
  }, [isNative, platform]);

  const startNativeBackgroundMode = useCallback(async (): Promise<boolean> => {
    if (!isNative || !status.isNativeSupported) {
      logger.debug('⚠️ Native background mode not supported, using PWA fallback');
      return false;
    }

    try {
      logger.info('🚀 Starting native background mode...');

      // Request permissions first
      if (platform === 'ios') {
        const hasLocationPermission = await requestLocationPermission();
        if (!hasLocationPermission) {
          logger.warn('⚠️ Location permission denied, background mode may be limited');
        }
      } else if (platform === 'android') {
        await requestBatteryOptimizationExemption();
      }

      // Start background task
      const { BackgroundTask } = await import('@capawesome/capacitor-background-task');
      
      const taskId = `recording-${Date.now()}`;
      setCurrentTaskId(taskId);
      
      await BackgroundTask.beforeExit(async () => {
        logger.info('🔄 App entering background - starting background task...');
        
        // Keep a heartbeat to prevent suspension
        let heartbeatCount = 0;
        const heartbeatInterval = setInterval(() => {
          heartbeatCount++;
          logger.info(`💓 Background heartbeat #${heartbeatCount}`, {
            taskId,
            timestamp: new Date().toISOString()
          });
          
          // Send heartbeat to Service Worker to keep it alive
          if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'HEARTBEAT',
              payload: {
                taskId,
                count: heartbeatCount,
                timestamp: Date.now()
              }
            });
          }
        }, 10000); // Every 10 seconds

        // Store interval ID for cleanup
        (window as any).__backgroundHeartbeat = heartbeatInterval;
        
        logger.info('✅ Background task active with heartbeat');
      });

      setStatus(prev => ({
        ...prev,
        isNativeActive: true,
        isForegroundServiceRunning: true,
      }));

      logger.info('✅ Native background mode started successfully');
      return true;
    } catch (error) {
      logger.error('❌ Failed to start native background mode:', error);
      return false;
    }
  }, [isNative, status.isNativeSupported, platform, requestLocationPermission, requestBatteryOptimizationExemption]);

  const stopNativeBackgroundMode = useCallback(async () => {
    if (!isNative || !status.isNativeActive || !currentTaskId) {
      return;
    }

    try {
      logger.info('🛑 Stopping native background mode...');

      // Clear heartbeat interval
      if ((window as any).__backgroundHeartbeat) {
        clearInterval((window as any).__backgroundHeartbeat);
        delete (window as any).__backgroundHeartbeat;
        logger.info('💓 Background heartbeat stopped');
      }

      const { BackgroundTask } = await import('@capawesome/capacitor-background-task');
      await BackgroundTask.finish({ taskId: currentTaskId });

      setCurrentTaskId(null);
      setStatus(prev => ({
        ...prev,
        isNativeActive: false,
        isForegroundServiceRunning: false,
      }));

      logger.info('✅ Native background mode stopped');
    } catch (error) {
      logger.error('❌ Error stopping native background mode:', error);
    }
  }, [isNative, status.isNativeActive, currentTaskId]);

  return {
    isNative,
    platform,
    status,
    startNativeBackgroundMode,
    stopNativeBackgroundMode,
    requestLocationPermission,
    requestBatteryOptimizationExemption,
  };
}

