import { PMScanData } from '@/lib/pmscan/types';
import { LocationData } from '@/types/PMScan';
import { recordingService } from './recordingService';
import * as logger from '@/utils/logger';

class BackgroundRecordingService {
  private static instance: BackgroundRecordingService;
  private isBackgroundActive = false;
  private visibilityChangeHandler: (() => void) | null = null;
  private backgroundInterval: NodeJS.Timeout | null = null;
  private lastDataTime: number = 0;

  static getInstance(): BackgroundRecordingService {
    if (!BackgroundRecordingService.instance) {
      BackgroundRecordingService.instance = new BackgroundRecordingService();
    }
    return BackgroundRecordingService.instance;
  }

  enableBackgroundRecording(): void {
    if (this.isBackgroundActive) return;

    this.isBackgroundActive = true;
    this.setupVisibilityHandler();
    logger.debug('🌙 Background recording service enabled');
  }

  disableBackgroundRecording(): void {
    this.isBackgroundActive = false;
    this.cleanupVisibilityHandler();
    this.stopBackgroundInterval();
    logger.debug('🌙 Background recording service disabled');
  }

  private setupVisibilityHandler(): void {
    this.visibilityChangeHandler = () => {
      if (document.hidden && this.isBackgroundActive) {
        this.startBackgroundInterval();
        logger.debug('🌙 Tab hidden - starting background data collection');
      } else {
        this.stopBackgroundInterval();
        logger.debug('🌙 Tab visible - stopping background data collection');
      }
    };

    document.addEventListener('visibilitychange', this.visibilityChangeHandler);
  }

  private cleanupVisibilityHandler(): void {
    if (this.visibilityChangeHandler) {
      document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
      this.visibilityChangeHandler = null;
    }
  }

  private startBackgroundInterval(): void {
    if (this.backgroundInterval) return;

    // Continue recording at the same frequency as the main recording
    const recordingState = recordingService.getState();
    if (!recordingState.isRecording) return;

    const frequencyMs = this.parseFrequencyToMs(recordingState.recordingFrequency);

    this.backgroundInterval = setInterval(() => {
      this.checkForNewData();
    }, Math.min(frequencyMs, 2000)); // Check every 2 seconds max

    logger.debug('🌙 Background data collection interval started');
  }

  private stopBackgroundInterval(): void {
    if (this.backgroundInterval) {
      clearInterval(this.backgroundInterval);
      this.backgroundInterval = null;
      logger.debug('🌙 Background data collection interval stopped');
    }
  }

  private checkForNewData(): void {
    // Send message to service worker to continue data collection
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'BACKGROUND_DATA_REQUEST',
        timestamp: Date.now()
      });
    }

    // Also send a keep-alive signal to prevent browser from throttling
    this.sendKeepAlive();
  }

  private sendKeepAlive(): void {
    // Use requestIdleCallback to minimize performance impact
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        // Minimal work to keep the tab active
        performance.now();
      });
    }
  }

  private parseFrequencyToMs(frequency: string): number {
    const match = frequency.match(/(\d+)([sm])/);
    if (!match) return 10000; // Default 10 seconds

    const value = parseInt(match[1]);
    const unit = match[2];

    return unit === 's' ? value * 1000 : value * 60 * 1000;
  }

  // Handle data from PMScan even when in background
  addBackgroundDataPoint(pmData: PMScanData, location?: LocationData, context?: any): void {
    if (!this.isBackgroundActive) return;

    const now = Date.now();
    const recordingState = recordingService.getState();
    
    if (!recordingState.isRecording) return;

    const frequencyMs = this.parseFrequencyToMs(recordingState.recordingFrequency);
    
    // Throttle data points based on recording frequency
    if (now - this.lastDataTime < frequencyMs) return;

    this.lastDataTime = now;

    // Store via service worker for persistence
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'STORE_BACKGROUND_DATA',
        payload: {
          pmData,
          location,
          context,
          timestamp: now,
          recordingId: recordingState.currentMissionId
        }
      });
    }

    // Also add to main recording service if tab is still somewhat active
    recordingService.addDataPoint(pmData, location, context);

    logger.debug('🌙 Background data point collected');
  }
}

export const backgroundRecordingService = BackgroundRecordingService.getInstance();
