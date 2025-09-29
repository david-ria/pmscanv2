import { MotionWalkingSignature, WalkingSigSnapshot } from '@/services/motionWalkingSignature';

/**
 * Singleton sensor manager for auto-context
 * Ensures only one instance of MotionWalkingSignature exists across the app
 */
class AutoContextSensorManager {
  private static instance: AutoContextSensorManager | null = null;
  private motionWalkingSignature: MotionWalkingSignature;
  private referenceCount = 0;
  private isStarted = false;

  private constructor() {
    this.motionWalkingSignature = new MotionWalkingSignature();
  }

  static getInstance(): AutoContextSensorManager {
    if (!AutoContextSensorManager.instance) {
      AutoContextSensorManager.instance = new AutoContextSensorManager();
    }
    return AutoContextSensorManager.instance;
  }

  /**
   * Start the motion sensor with reference counting
   */
  async addReference(): Promise<void> {
    this.referenceCount++;
    
    if (!this.isStarted) {
      try {
        await this.motionWalkingSignature.start();
        this.isStarted = true;
        console.log(`AutoContextSensorManager: Started motion sensor (refs: ${this.referenceCount})`);
      } catch (error) {
        console.error('AutoContextSensorManager: Failed to start motion sensor:', error);
        this.referenceCount--; // Decrement on failure
        throw error;
      }
    } else {
      console.log(`AutoContextSensorManager: Added reference (refs: ${this.referenceCount})`);
    }
  }

  /**
   * Stop the motion sensor when no more references
   */
  removeReference(): void {
    this.referenceCount = Math.max(0, this.referenceCount - 1);
    
    if (this.referenceCount === 0 && this.isStarted) {
      this.motionWalkingSignature.stop();
      this.isStarted = false;
      console.log('AutoContextSensorManager: Stopped motion sensor (no more refs)');
    } else {
      console.log(`AutoContextSensorManager: Removed reference (refs: ${this.referenceCount})`);
    }
  }

  /**
   * Get the current walking signature snapshot
   */
  getWalkingSnapshot(): WalkingSigSnapshot {
    return this.motionWalkingSignature.getSnapshot();
  }

  /**
   * Get the singleton MotionWalkingSignature instance
   * @deprecated Use getWalkingSnapshot() instead for better encapsulation
   */
  getMotionWalkingSignature(): MotionWalkingSignature {
    return this.motionWalkingSignature;
  }

  /**
   * Force stop all sensors (for cleanup)
   */
  forceStop(): void {
    if (this.isStarted) {
      this.motionWalkingSignature.stop();
      this.isStarted = false;
    }
    this.referenceCount = 0;
    console.log('AutoContextSensorManager: Force stopped all sensors');
  }
}

export const autoContextSensorManager = AutoContextSensorManager.getInstance();