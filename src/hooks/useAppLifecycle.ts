import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { App, AppState } from '@capacitor/app';
import { globalConnectionManager, setGlobalRecording, setBackgroundRecording } from '@/lib/pmscan/globalConnectionManager';
import { sessionPersistence } from '@/services/sessionPersistence';
import * as logger from '@/utils/logger';

export type AppLifecycleState = 'active' | 'background' | 'inactive';

export interface AppLifecycleEvents {
  onForeground?: () => void;
  onBackground?: () => void;
  onVisibilityChange?: (visible: boolean) => void;
  onOrientationChange?: (orientation: OrientationType | undefined) => void;
  onAppStateChange?: (state: AppState) => void;
}

export function useAppLifecycle(events: AppLifecycleEvents = {}) {
  const [appState, setAppState] = useState<AppLifecycleState>('active');
  const [isVisible, setIsVisible] = useState(!document.hidden);
  const [orientation, setOrientation] = useState<OrientationType | undefined>(
    screen.orientation?.type
  );
  
  const lastStateRef = useRef<AppLifecycleState>('active');
  const isRestoringRef = useRef(false);

  // Handle web visibility change
  const handleVisibilityChange = useCallback(() => {
    const visible = !document.hidden;
    setIsVisible(visible);
    
    const newState: AppLifecycleState = visible ? 'active' : 'background';
    
    if (newState !== lastStateRef.current) {
      logger.debug(`🔄 App lifecycle: ${lastStateRef.current} → ${newState}`);
      setAppState(newState);
      
      if (newState === 'active' && lastStateRef.current === 'background') {
        handleForegroundTransition();
      } else if (newState === 'background' && lastStateRef.current === 'active') {
        handleBackgroundTransition();
      }
      
      lastStateRef.current = newState;
    }
    
    events.onVisibilityChange?.(visible);
  }, [events]);

  // Handle orientation change
  const handleOrientationChange = useCallback(() => {
    const newOrientation = screen.orientation?.type;
    if (newOrientation !== orientation) {
      logger.debug(`🔄 Orientation changed: ${orientation} → ${newOrientation}`);
      
      // Persist current session before orientation change
      sessionPersistence.persistCurrentSession();
      
      setOrientation(newOrientation);
      events.onOrientationChange?.(newOrientation);
    }
  }, [orientation, events]);

  // Handle native app state change (Capacitor)
  const handleAppStateChange = useCallback((state: AppState) => {
    logger.debug(`📱 Native app state: ${state.isActive ? 'active' : 'background'}`);
    
    const newState: AppLifecycleState = state.isActive ? 'active' : 'background';
    
    if (newState !== lastStateRef.current) {
      setAppState(newState);
      
      if (newState === 'active' && lastStateRef.current === 'background') {
        handleForegroundTransition();
      } else if (newState === 'background' && lastStateRef.current === 'active') {
        handleBackgroundTransition();
      }
      
      lastStateRef.current = newState;
    }
    
    events.onAppStateChange?.(state);
  }, [events]);

  // Handle transition to foreground
  const handleForegroundTransition = useCallback(async () => {
    if (isRestoringRef.current) return;
    
    logger.debug('🌅 App entering foreground');
    events.onForeground?.();
    
    try {
      isRestoringRef.current = true;
      
      // Restore session if needed
      const sessionRestored = await sessionPersistence.restoreSession();
      
      if (sessionRestored) {
        logger.debug('✅ Session restored from foreground transition');
        
        // Restore PMScan connection if needed
        if (globalConnectionManager.shouldAutoConnect()) {
          try {
            await globalConnectionManager.connect();
            logger.debug('✅ PMScan reconnected on foreground');
          } catch (error) {
            logger.warn('⚠️ Failed to reconnect PMScan on foreground:', error);
          }
        }
      }
    } catch (error) {
      logger.error('❌ Error during foreground transition:', error);
    } finally {
      isRestoringRef.current = false;
    }
  }, [events]);

  // Handle transition to background
  const handleBackgroundTransition = useCallback(() => {
    logger.debug('🌙 App entering background');
    events.onBackground?.();
    
    // Persist current session
    sessionPersistence.persistCurrentSession();
  }, [events]);

  // Handle app termination/refresh
  const handleBeforeUnload = useCallback((event: BeforeUnloadEvent) => {
    logger.debug('🔄 App terminating/refreshing');
    sessionPersistence.persistCurrentSession();
    
    // Don't show confirmation dialog unless actively recording
    const isRecording = sessionPersistence.getCurrentRecordingState();
    if (isRecording) {
      event.preventDefault();
      event.returnValue = 'Recording in progress. Are you sure you want to leave?';
      return event.returnValue;
    }
  }, []);

  // Handle page hide (mobile)
  const handlePageHide = useCallback(() => {
    logger.debug('📱 Page hidden (mobile)');
    sessionPersistence.persistCurrentSession();
  }, []);

  // Setup event listeners
  useEffect(() => {
    // Web visibility API
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Orientation change
    if (screen.orientation) {
      screen.orientation.addEventListener('change', handleOrientationChange);
    }
    
    // App lifecycle events
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);

    // Capacitor app state (mobile)
    let appStateListener: any;
    if (Capacitor.isNativePlatform()) {
      appStateListener = App.addListener('appStateChange', handleAppStateChange);
    }

    // Initial session restoration on mount
    sessionPersistence.restoreSession().catch(error => {
      logger.warn('⚠️ Failed to restore session on mount:', error);
    });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (screen.orientation) {
        screen.orientation.removeEventListener('change', handleOrientationChange);
      }
      
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
      
      if (appStateListener) {
        appStateListener.remove();
      }
    };
  }, [handleVisibilityChange, handleOrientationChange, handleBeforeUnload, handlePageHide, handleAppStateChange]);

  return {
    appState,
    isVisible,
    orientation,
    isRestoring: isRestoringRef.current,
    // Utility methods
    persistSession: sessionPersistence.persistCurrentSession,
    restoreSession: sessionPersistence.restoreSession,
    clearSession: sessionPersistence.clearSession
  };
}