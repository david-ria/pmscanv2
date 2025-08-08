import { recordingService } from './recordingService';
import * as logger from '@/utils/logger';

class SimpleBackgroundRecording {
  private static instance: SimpleBackgroundRecording;
  private wakeLock: WakeLockSentinel | null = null;
  private isActive = false;

  static getInstance(): SimpleBackgroundRecording {
    if (!SimpleBackgroundRecording.instance) {
      SimpleBackgroundRecording.instance = new SimpleBackgroundRecording();
    }
    return SimpleBackgroundRecording.instance;
  }

  async enable(): Promise<void> {
    if (this.isActive) return;

    try {
      // Request wake lock to prevent throttling
      if ('wakeLock' in navigator) {
        this.wakeLock = await navigator.wakeLock.request('screen');
        logger.debug('🔒 Wake lock acquired for background recording');
        
        this.wakeLock.addEventListener('release', () => {
          logger.debug('🔓 Wake lock was released');
        });
      }

      // Keep the connection alive with a minimal heartbeat
      this.startHeartbeat();
      
      this.isActive = true;
      logger.debug('✅ Simple background recording enabled');
      
    } catch (error) {
      logger.debug('⚠️ Failed to enable background recording:', error);
    }
  }

  async disable(): Promise<void> {
    if (!this.isActive) return;

    try {
      // Release wake lock
      if (this.wakeLock) {
        await this.wakeLock.release();
        this.wakeLock = null;
        logger.debug('🔓 Wake lock released');
      }

      this.stopHeartbeat();
      this.isActive = false;
      logger.debug('✅ Simple background recording disabled');
      
    } catch (error) {
      logger.debug('⚠️ Failed to disable background recording:', error);
    }
  }

  private heartbeatInterval: NodeJS.Timeout | null = null;

  private startHeartbeat(): void {
    if (this.heartbeatInterval) return;

    // Send a heartbeat every 5 seconds to keep the connection alive
    this.heartbeatInterval = setInterval(() => {
      if (!recordingService.getState().isRecording) {
        this.disable();
        return;
      }

      // Minimal operation to prevent throttling
      if (document.hidden) {
        // When tab is hidden, do a minimal operation to prevent throttling
        performance.now();
        
        // Send a message to service worker to keep it alive
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'HEARTBEAT',
            timestamp: Date.now()
          });
        }
      }
    }, 5000);

    logger.debug('💓 Background heartbeat started');
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      logger.debug('💔 Background heartbeat stopped');
    }
  }

  isEnabled(): boolean {
    return this.isActive;
  }
}

export const simpleBackgroundRecording = SimpleBackgroundRecording.getInstance();
