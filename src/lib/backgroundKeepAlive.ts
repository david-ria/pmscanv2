/**
 * Background Keep-Alive System
 * 
 * Prevents iOS/Android from suspending the app during background recording
 * by playing silent audio continuously. This is a widely-used technique
 * to maintain background execution on mobile browsers.
 */

import * as logger from '@/utils/logger';

class BackgroundKeepAlive {
  private audioContext: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private isActive: boolean = false;

  /**
   * Start silent audio playback to keep the app alive in background
   */
  async start(): Promise<void> {
    if (this.isActive) {
      logger.debug('🔊 Silent audio keep-alive already active');
      return;
    }

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
      
      this.isActive = true;
      logger.info('🔊 Silent audio keep-alive started (20Hz @ 0.1% volume)');
      
      // Resume audio context if it gets suspended (iOS behavior)
      this.setupAutoResume();
    } catch (error) {
      logger.error('❌ Failed to start silent audio keep-alive:', error);
      throw error;
    }
  }

  /**
   * Stop silent audio playback
   */
  stop(): void {
    if (!this.isActive) {
      return;
    }

    try {
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

      this.isActive = false;
      logger.info('🔇 Silent audio keep-alive stopped');
    } catch (error) {
      logger.error('❌ Failed to stop silent audio keep-alive:', error);
    }
  }

  /**
   * Setup auto-resume for iOS (audio context gets suspended when app backgrounds)
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

    // Resume on visibility change (app returns to foreground)
    document.addEventListener('visibilitychange', resumeAudio);
    
    // Resume on user interaction (iOS requirement)
    document.addEventListener('touchstart', resumeAudio, { once: true });
    document.addEventListener('click', resumeAudio, { once: true });
  }

  /**
   * Check if keep-alive is currently active
   */
  isRunning(): boolean {
    return this.isActive && this.audioContext?.state === 'running';
  }

  /**
   * Get current audio context state
   */
  getState(): string {
    if (!this.audioContext) return 'not-initialized';
    return this.audioContext.state;
  }
}

// Singleton instance
export const backgroundKeepAlive = new BackgroundKeepAlive();
