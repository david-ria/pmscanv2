/**
 * Background Keep-Alive System
 * 
 * Prevents iOS/Android from suspending the app during background recording
 * using two complementary techniques:
 * - Silent Audio (iOS): Plays inaudible audio to keep app alive
 * - Wake Lock API (Android): Prevents screen/CPU from sleeping
 */

import * as logger from '@/utils/logger';

// Platform detection
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
const isAndroid = /Android/.test(navigator.userAgent);

class BackgroundKeepAlive {
  // Silent Audio (iOS)
  private audioContext: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  
  // Wake Lock API (Android)
  private wakeLock: WakeLockSentinel | null = null;
  
  private isActive: boolean = false;

  /**
   * Start keep-alive mechanisms (platform-specific)
   */
  async start(): Promise<void> {
    if (this.isActive) {
      logger.debug('🔒 Keep-alive already active');
      return;
    }

    try {
      // iOS: Silent Audio
      if (isIOS) {
        await this.startSilentAudio();
      }
      
      // Android: Wake Lock API
      if (isAndroid && 'wakeLock' in navigator) {
        await this.requestWakeLock();
      }
      
      // Fallback: Silent Audio for non-iOS devices without Wake Lock
      if (!isIOS && (!('wakeLock' in navigator) || !isAndroid)) {
        await this.startSilentAudio();
      }
      
      this.isActive = true;
      
      // Setup auto-resume handlers
      this.setupAutoResume();
      this.setupVisibilityHandler();
      
      logger.info('🔒 Keep-alive started:', {
        platform: isIOS ? 'iOS' : isAndroid ? 'Android' : 'Other',
        audio: !!this.audioContext,
        wakeLock: !!this.wakeLock
      });
    } catch (error) {
      logger.error('❌ Failed to start keep-alive:', error);
      throw error;
    }
  }

  /**
   * Start silent audio playback (iOS & fallback)
   */
  private async startSilentAudio(): Promise<void> {
    try {
      // Create AudioContext (iOS requires user interaction to initialize)
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create oscillator (generates audio signal)
      this.oscillator = this.audioContext.createOscillator();
      this.oscillator.frequency.value = 20; // 20Hz - below human hearing range
      
      // Create gain node (volume control)
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 0.001; // Nearly silent (0.1% volume)
      
      // Connect: oscillator -> gain -> output
      this.oscillator.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);
      
      // Start playback
      this.oscillator.start();
      
      logger.info('🔊 Silent audio started (20Hz @ 0.1% volume)');
    } catch (error) {
      logger.error('❌ Failed to start silent audio:', error);
      throw error;
    }
  }

  /**
   * Request Wake Lock (Android)
   */
  private async requestWakeLock(): Promise<void> {
    try {
      if (!('wakeLock' in navigator)) {
        logger.warn('⚠️ Wake Lock API not supported');
        return;
      }

      this.wakeLock = await (navigator as any).wakeLock.request('screen');
      
      this.wakeLock.addEventListener('release', () => {
        logger.debug('🔓 Wake lock released');
      });
      
      logger.info('🔒 Wake Lock acquired');
    } catch (error) {
      logger.error('❌ Failed to acquire Wake Lock:', error);
      // Don't throw - silent audio will be fallback
    }
  }

  /**
   * Stop all keep-alive mechanisms
   */
  stop(): void {
    if (!this.isActive) {
      return;
    }

    try {
      // Stop silent audio
      if (this.oscillator) {
        this.oscillator.stop();
        this.oscillator.disconnect();
        this.oscillator = null;
      }

      if (this.gainNode) {
        this.gainNode.disconnect();
        this.gainNode = null;
      }

      if (this.audioContext) {
        this.audioContext.close();
        this.audioContext = null;
      }

      // Release wake lock
      if (this.wakeLock) {
        this.wakeLock.release().then(() => {
          logger.debug('🔓 Wake Lock released');
        }).catch(error => {
          logger.warn('⚠️ Failed to release Wake Lock:', error);
        });
        this.wakeLock = null;
      }

      this.isActive = false;
      logger.info('🔓 Keep-alive stopped');
    } catch (error) {
      logger.error('❌ Failed to stop keep-alive:', error);
    }
  }

  /**
   * Setup auto-resume for audio context (iOS)
   */
  private setupAutoResume(): void {
    if (!this.audioContext) return;

    const resumeAudio = () => {
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume().then(() => {
          logger.debug('🔊 Audio context resumed');
        }).catch((error) => {
          logger.warn('⚠️ Failed to resume audio context:', error);
        });
      }
    };

    // Resume on user interaction (iOS requirement)
    document.addEventListener('touchstart', resumeAudio, { once: true });
    document.addEventListener('click', resumeAudio, { once: true });
  }

  /**
   * Setup visibility change handler to re-acquire wake lock
   */
  private setupVisibilityHandler(): void {
    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState === 'visible' && this.isActive) {
        // Re-acquire wake lock when app returns to foreground (Android)
        if (isAndroid && 'wakeLock' in navigator && !this.wakeLock) {
          await this.requestWakeLock();
        }
        
        // Resume audio context if suspended (iOS)
        if (this.audioContext && this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
          logger.debug('🔊 Audio context resumed on visibility change');
        }
      }
    });
  }

  /**
   * Check if keep-alive is currently active
   */
  isRunning(): boolean {
    const audioRunning = this.audioContext?.state === 'running';
    const wakeLockActive = this.wakeLock !== null;
    return this.isActive && (audioRunning || wakeLockActive);
  }

  /**
   * Get current state details
   */
  getState(): {
    active: boolean;
    platform: string;
    audio: string | null;
    wakeLock: boolean;
  } {
    return {
      active: this.isActive,
      platform: isIOS ? 'iOS' : isAndroid ? 'Android' : 'Other',
      audio: this.audioContext?.state || null,
      wakeLock: this.wakeLock !== null
    };
  }
}

// Singleton instance
export const backgroundKeepAlive = new BackgroundKeepAlive();
