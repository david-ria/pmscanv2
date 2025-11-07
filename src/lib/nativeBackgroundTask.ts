/**
 * Native Background Task Manager
 * 
 * Manages Capacitor Background Task for Android/iOS
 * Keeps app alive during background recording
 */

import { Capacitor } from '@capacitor/core';
import * as logger from '@/utils/logger';

class NativeBackgroundTaskManager {
  private taskId: string | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isActive: boolean = false;

  /**
   * Start native background task
   */
  async start(): Promise<boolean> {
    // Only run on native platforms
    if (!Capacitor.isNativePlatform()) {
      logger.debug('📱 Not on native platform, skipping background task');
      return false;
    }

    // Check if already active
    if (this.isActive) {
      logger.warn('⚠️ Background task already active');
      return true;
    }

    // Check if plugin is available
    if (!Capacitor.isPluginAvailable('BackgroundTask')) {
      logger.warn('⚠️ BackgroundTask plugin not available');
      return false;
    }

    try {
      logger.info('🚀 Starting native background task...');

      const { BackgroundTask } = await import('@capawesome/capacitor-background-task');
      
      this.taskId = `recording-${Date.now()}`;
      
      await BackgroundTask.beforeExit(async () => {
        logger.info('🔄 App entering background - activating background task...');
        
        // Start heartbeat to prevent suspension
        let heartbeatCount = 0;
        this.heartbeatInterval = setInterval(() => {
          heartbeatCount++;
          logger.info(`💓 Background heartbeat #${heartbeatCount}`, {
            taskId: this.taskId,
            timestamp: new Date().toISOString(),
            platform: Capacitor.getPlatform()
          });
          
          // Send heartbeat to Service Worker
          if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'HEARTBEAT',
              payload: {
                taskId: this.taskId,
                count: heartbeatCount,
                timestamp: Date.now()
              }
            });
          }
        }, 10000); // Every 10 seconds
        
        logger.info('✅ Background task active with heartbeat');
      });

      this.isActive = true;
      logger.info('✅ Native background task started successfully', {
        taskId: this.taskId,
        platform: Capacitor.getPlatform()
      });
      
      return true;
    } catch (error) {
      logger.error('❌ Failed to start native background task:', error);
      return false;
    }
  }

  /**
   * Stop native background task
   */
  async stop(): Promise<void> {
    if (!this.isActive || !this.taskId) {
      logger.debug('⚠️ Background task not active, nothing to stop');
      return;
    }

    try {
      logger.info('🛑 Stopping native background task...');

      // Clear heartbeat
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
        logger.info('💓 Background heartbeat stopped');
      }

      // Finish background task
      const { BackgroundTask } = await import('@capawesome/capacitor-background-task');
      await BackgroundTask.finish({ taskId: this.taskId });

      this.taskId = null;
      this.isActive = false;

      logger.info('✅ Native background task stopped');
    } catch (error) {
      logger.error('❌ Error stopping native background task:', error);
    }
  }

  /**
   * Check if task is active
   */
  isRunning(): boolean {
    return this.isActive;
  }

  /**
   * Get current task ID
   */
  getTaskId(): string | null {
    return this.taskId;
  }
}

// Singleton instance
export const nativeBackgroundTask = new NativeBackgroundTaskManager();
