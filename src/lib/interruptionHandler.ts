/**
 * Interruption Detection & Emergency Save System
 * 
 * Detects app interruptions (phone calls, background transitions, etc.)
 * and triggers emergency data save to IndexedDB before suspension.
 */

import * as logger from '@/utils/logger';

export type InterruptionType = 
  | 'visibility-hidden' 
  | 'page-hide' 
  | 'before-unload'
  | 'freeze'
  | 'blur'
  | 'pause';

export interface InterruptionEvent {
  type: InterruptionType;
  timestamp: number;
  wasRecording: boolean;
}

export type InterruptionCallback = (event: InterruptionEvent) => void | Promise<void>;

class InterruptionHandler {
  private callbacks: Set<InterruptionCallback> = new Set();
  private lastInterruption: InterruptionEvent | null = null;
  private isRecording: boolean = false;
  private freezeTimeout: number | null = null;

  constructor() {
    this.setupListeners();
  }

  /**
   * Register callback to be called on interruptions
   */
  onInterruption(callback: InterruptionCallback): () => void {
    this.callbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback);
    };
  }

  /**
   * Set recording state (used to determine if emergency save needed)
   */
  setRecordingState(isRecording: boolean): void {
    this.isRecording = isRecording;
    logger.debug('📝 Interruption handler: recording state =', isRecording);
  }

  /**
   * Get last interruption event
   */
  getLastInterruption(): InterruptionEvent | null {
    return this.lastInterruption;
  }

  /**
   * Setup all interruption detection listeners
   */
  private setupListeners(): void {
    // 1. Visibility Change - Most reliable for background detection
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.handleInterruption('visibility-hidden');
      }
    });

    // 2. Page Hide - Fires when page is being unloaded
    window.addEventListener('pagehide', (event) => {
      this.handleInterruption('page-hide');
    });

    // 3. Before Unload - Last chance before page closes
    window.addEventListener('beforeunload', (event) => {
      if (this.isRecording) {
        this.handleInterruption('before-unload');
        // Note: Don't prevent default - we just want to save data
      }
    });

    // 4. Window Blur - Loss of focus (app switcher, phone call)
    window.addEventListener('blur', () => {
      // Only trigger if recording (avoid false positives)
      if (this.isRecording) {
        this.handleInterruption('blur');
      }
    });

    // 5. Page Lifecycle API - Freeze state (iOS/Android aggressive background)
    document.addEventListener('freeze', () => {
      this.handleInterruption('freeze');
    });

    // 6. Page Lifecycle API - Resume state
    document.addEventListener('resume', () => {
      logger.info('🔄 App resumed from freeze');
      if (this.freezeTimeout) {
        clearTimeout(this.freezeTimeout);
        this.freezeTimeout = null;
      }
    });

    // 7. Android-specific: pause event
    if ('onpause' in window) {
      (window as any).addEventListener('pause', () => {
        this.handleInterruption('pause');
      });
    }

    logger.info('👂 Interruption detection listeners installed');
  }

  /**
   * Handle interruption event
   */
  private async handleInterruption(type: InterruptionType): Promise<void> {
    const event: InterruptionEvent = {
      type,
      timestamp: Date.now(),
      wasRecording: this.isRecording
    };

    this.lastInterruption = event;

    logger.warn('⚠️ Interruption detected:', {
      type,
      recording: this.isRecording,
      timestamp: new Date(event.timestamp).toISOString()
    });

    // Execute all registered callbacks
    const promises: Promise<void>[] = [];
    
    this.callbacks.forEach(callback => {
      try {
        const result = callback(event);
        if (result instanceof Promise) {
          promises.push(result);
        }
      } catch (error) {
        logger.error('❌ Interruption callback error:', error);
      }
    });

    // Wait for all callbacks (with timeout for critical interruptions)
    if (promises.length > 0) {
      const criticalTypes: InterruptionType[] = ['page-hide', 'before-unload', 'freeze'];
      const isCritical = criticalTypes.includes(type);
      
      if (isCritical) {
        // Race against 500ms timeout for critical events
        await Promise.race([
          Promise.all(promises),
          new Promise(resolve => setTimeout(resolve, 500))
        ]);
      } else {
        // Best effort for non-critical
        await Promise.allSettled(promises);
      }
    }
  }

  /**
   * Manually trigger emergency save (for testing)
   */
  async triggerEmergencySave(): Promise<void> {
    logger.info('🚨 Manual emergency save triggered');
    await this.handleInterruption('before-unload');
  }
}

// Singleton instance
export const interruptionHandler = new InterruptionHandler();
