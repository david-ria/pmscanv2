import { globalConnectionManager, getGlobalRecording, getBackgroundRecording } from '@/lib/pmscan/globalConnectionManager';
import { STORAGE_KEYS } from '@/services/storageService';
import * as logger from '@/utils/logger';

interface SessionState {
  connectionState: string;
  isGlobalRecording: boolean;
  isBackgroundRecording: boolean;
  missionContext?: {
    location?: string;
    activity?: string;
  };
  pmScanDevice?: {
    id?: string;
    name?: string;
  };
  timestamp: number;
}

class SessionPersistenceService {
  private readonly SESSION_KEY = 'pmscan-session-state';
  private readonly SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes

  /**
   * Persist current session state to localStorage
   */
  persistCurrentSession(): void {
    try {
      const sessionState: SessionState = {
        connectionState: globalConnectionManager.getConnectionState().toString(),
        isGlobalRecording: getGlobalRecording(),
        isBackgroundRecording: getBackgroundRecording(),
        missionContext: {
          location: localStorage.getItem('recording-location') || undefined,
          activity: localStorage.getItem('recording-activity') || undefined,
        },
        pmScanDevice: undefined, // Device info not exposed publicly
        timestamp: Date.now()
      };

      localStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionState));
      logger.debug('💾 Session state persisted:', sessionState);
    } catch (error) {
      logger.error('❌ Failed to persist session state:', error);
    }
  }

  /**
   * Restore session from localStorage if valid
   */
  async restoreSession(): Promise<boolean> {
    try {
      const stored = localStorage.getItem(this.SESSION_KEY);
      if (!stored) {
        logger.debug('📭 No session state to restore');
        return false;
      }

      const sessionState: SessionState = JSON.parse(stored);
      
      // Check if session is still valid (not too old)
      if (Date.now() - sessionState.timestamp > this.SESSION_TIMEOUT) {
        logger.debug('⏰ Session state expired, clearing');
        this.clearSession();
        return false;
      }

      logger.debug('🔄 Restoring session state:', sessionState);

      // Restore mission context
      if (sessionState.missionContext?.location) {
        localStorage.setItem('recording-location', sessionState.missionContext.location);
      }
      if (sessionState.missionContext?.activity) {
        localStorage.setItem('recording-activity', sessionState.missionContext.activity);
      }

      // Restore recording states - these will trigger auto-reconnection if needed
      if (sessionState.isGlobalRecording !== getGlobalRecording()) {
        const { setGlobalRecording } = await import('@/lib/pmscan/globalConnectionManager');
        setGlobalRecording(sessionState.isGlobalRecording);
      }

      if (sessionState.isBackgroundRecording !== getBackgroundRecording()) {
        const { setBackgroundRecording } = await import('@/lib/pmscan/globalConnectionManager');
        setBackgroundRecording(sessionState.isBackgroundRecording);
      }

      // If we were connected and recording, attempt reconnection
      if ((sessionState.isGlobalRecording || sessionState.isBackgroundRecording) && 
          !globalConnectionManager.isConnected() && 
          globalConnectionManager.shouldAutoConnect()) {
        
        logger.debug('🔄 Attempting to restore PMScan connection...');
        try {
          await globalConnectionManager.connect();
          logger.debug('✅ PMScan connection restored');
        } catch (error) {
          logger.warn('⚠️ Failed to restore PMScan connection:', error);
        }
      }

      return true;
    } catch (error) {
      logger.error('❌ Failed to restore session state:', error);
      this.clearSession();
      return false;
    }
  }

  /**
   * Clear stored session state
   */
  clearSession(): void {
    try {
      localStorage.removeItem(this.SESSION_KEY);
      logger.debug('🗑️ Session state cleared');
    } catch (error) {
      logger.error('❌ Failed to clear session state:', error);
    }
  }

  /**
   * Check if currently recording (used for beforeunload warning)
   */
  getCurrentRecordingState(): boolean {
    return getGlobalRecording() || getBackgroundRecording();
  }

  /**
   * Get current session info for debugging
   */
  getSessionInfo(): SessionState | null {
    try {
      const stored = localStorage.getItem(this.SESSION_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }
}

export const sessionPersistence = new SessionPersistenceService();