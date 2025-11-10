import { useState, useCallback, useRef } from 'react';
import { PMScanData } from '@/lib/pmscan/types';
import { LocationData } from '@/types/PMScan';
import { RecordingEntry, MissionContext } from '@/types/recording';
import { setGlobalRecording, setBackgroundRecording } from '@/lib/pmscan/globalConnectionManager';
import * as logger from '@/utils/logger';
import { backgroundKeepAlive } from '@/lib/backgroundKeepAlive';
import { createEpochMs, type EpochMs } from '@/utils/timestamp';

export interface RecordingState {
  recordingData: RecordingEntry[];
  isRecording: boolean;
  recordingFrequency: string;
  missionContext: MissionContext;
  recordingStartTime: Date | null;
}

export interface RecordingActions {
  startRecording: (frequency?: string) => void;
  stopRecording: () => void;
  addDataPoint: (
    pmData: PMScanData,
    location?: LocationData,
    manualContext?: MissionContext,
    automaticContext?: string,
    enrichedLocation?: string,
    geohash?: string,
    weatherDataId?: string
  ) => void;
  updateMissionContext: (location: string, activity: string) => void;
  clearRecordingData: () => void;
  // Removed saveMission - will use existing useMissionSaver instead
}

class RecordingService {
  private static instance: RecordingService;
  private listeners: Set<(state: RecordingState) => void> = new Set();
  private lastAddTime: number = 0;
  private readonly MIN_ADD_INTERVAL_MS = 900; // 900ms throttle for safety
  
  private state: RecordingState = {
    recordingData: [],
    isRecording: false,
    recordingFrequency: '10s',
    missionContext: { location: '', activity: '' },
    recordingStartTime: null,
  };

  static getInstance(): RecordingService {
    if (!RecordingService.instance) {
      RecordingService.instance = new RecordingService();
    }
    return RecordingService.instance;
  }

  subscribe(listener: (state: RecordingState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(listener => listener({ ...this.state }));
  }

  getState(): RecordingState {
    return { ...this.state };
  }

  /**
   * Start recording session with specified frequency
   * @param frequency - Recording frequency (e.g. "10s", "1m")
   */
  startRecording(frequency: string = '10s'): void {
    logger.debug('🎯 === RECORDING SERVICE startRecording() CALLED ===');
    logger.debug('🎯 Input frequency:', frequency);
    logger.debug('🎯 Current state before update:', {
      isRecording: this.state.isRecording,
      dataPoints: this.state.recordingData.length,
      frequency: this.state.recordingFrequency
    });
    
    // 🛡️ GUARD: If already recording, don't clear data!
    if (this.state.isRecording) {
      logger.warn('⚠️ startRecording() called while already recording!');
      logger.warn(`⚠️ Preserving ${this.state.recordingData.length} existing data points`);
      
      // Update frequency if changed, but preserve data
      if (frequency !== this.state.recordingFrequency) {
        logger.info(`📝 Updating recording frequency: ${this.state.recordingFrequency} → ${frequency}`);
        this.state = {
          ...this.state,
          recordingFrequency: frequency,
        };
        this.notify();
      }
      
      return; // Exit early - don't reinitialize recording
    }
    
    // Start fresh recording (only when not already recording)
    logger.info('✅ Starting NEW recording session');
    this.state = {
      ...this.state,
      isRecording: true,
      recordingFrequency: frequency,
      recordingStartTime: new Date(),
      recordingData: [], // Only clear when starting a NEW session
    };

    logger.debug('🎯 New state after update:', {
      isRecording: this.state.isRecording,
      dataPoints: this.state.recordingData.length,
      frequency: this.state.recordingFrequency
    });

    // Enable both global and background recording for continuity
    setGlobalRecording(true);
    setBackgroundRecording(true);
    
    // 🔊 Start silent audio to keep app alive in background (iOS/Android web)
    backgroundKeepAlive.start().catch((error) => {
      logger.warn('⚠️ Silent audio keep-alive failed to start:', error);
    });
    
    // 📱 Start native background task (Capacitor Android/iOS)
    import('@/lib/nativeBackgroundTask').then(({ nativeBackgroundTask }) => {
      nativeBackgroundTask.start().catch((error) => {
        logger.warn('⚠️ Native background task failed to start:', error);
      });
    });
    
    // Enable background collection via service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        if (registration.active) {
          registration.active.postMessage({
            type: 'START_BACKGROUND_RECORDING',
            frequency,
          });
          logger.debug('🎯 Service worker message sent');
        }
      }).catch(error => {
        logger.warn('⚠️ Failed to send START message to Service Worker:', error);
      });
    }
    
    logger.debug('🎯 About to notify listeners:', this.listeners.size, 'listeners');
    this.notify();
    
    logger.info('✅ Recording started! Final isRecording state:', this.state.isRecording);
  }

  /**
   * Stop current recording session
   */
  stopRecording(): void {
    logger.info('🛑 === RECORDING SERVICE STOP CALLED ===');
    logger.debug('🛑 Recording service stop - current state:', {
      isRecording: this.state.isRecording,
      recordingDataLength: this.state.recordingData.length,
      hasRecordingStartTime: !!this.state.recordingStartTime,
      recordingStartTime: this.state.recordingStartTime
    });
    
    this.state = {
      ...this.state,
      isRecording: false,
      // Keep recordingStartTime for mission saving - will be cleared when data is cleared
    };

    // Disable both global and background recording
    setGlobalRecording(false);
    setBackgroundRecording(false);
    
    // 🔇 Stop silent audio keep-alive
    backgroundKeepAlive.stop();
    
    // 📱 Stop native background task
    import('@/lib/nativeBackgroundTask').then(({ nativeBackgroundTask }) => {
      nativeBackgroundTask.stop().catch((error) => {
        logger.warn('⚠️ Failed to stop native background task:', error);
      });
    });
    
    // Stop background collection via service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        if (registration.active) {
          registration.active.postMessage({
            type: 'STOP_BACKGROUND_RECORDING',
          });
        }
      }).catch(error => {
        logger.warn('⚠️ Failed to send STOP message to Service Worker:', error);
      });
    }
    
    this.notify();
    
    logger.info('✅ Recording stopped successfully');
  }

  /**
   * Add a new data point to the recording
   * @param pmData - PM scan data from device
   * @param location - GPS location data (optional)
   * @param manualContext - User-provided context (location/activity)
   * @param automaticContext - Auto-detected context from sensors
   * @param enrichedLocation - Enriched location name from reverse geocoding
   * @param geohash - Spatial hash for privacy and indexing
   * @param weatherDataId - Weather data ID for this measurement
   */
  addDataPoint(
    pmData: PMScanData,
    location?: LocationData,
    manualContext?: MissionContext,
    automaticContext?: string,
    enrichedLocation?: string,
    geohash?: string,
    weatherDataId?: string
  ): void {
    // 🔍 DEBUG: Log what context was received
    console.log('📥 [RecordingService] addDataPoint received manualContext:', {
      location: manualContext?.location || 'EMPTY',
      activity: manualContext?.activity || 'EMPTY',
      pm25: pmData.pm25.toFixed(1),
      timestamp: new Date().toISOString()
    });

    if (!this.state.isRecording) {
      logger.debug('⚠️ Attempted to add data point while not recording');
      return;
    }

    // Internal throttle for safety - prevent too frequent additions
    const now = createEpochMs(); // Standardized timestamp
    if (now - this.lastAddTime < this.MIN_ADD_INTERVAL_MS) {
      logger.debug('⚠️ addDataPoint throttled - too frequent', {
        timeSinceLastAdd: now - this.lastAddTime,
        minInterval: this.MIN_ADD_INTERVAL_MS
      });
      return;
    }
    this.lastAddTime = now;

    const entry: RecordingEntry = {
      pmData,
      location,
      manualContext: manualContext || this.state.missionContext,
      automaticContext,
      enrichedLocation,
      geohash,
      weatherDataId,
      timestamp: pmData.timestamp, // Use PMScan timestamp (already standardized via createTimestamp)
    };

    // 🔍 DEBUG: Log what context is being stored
    console.log('💾 [RecordingService] Storing entry with context:', {
      location: entry.manualContext?.location || 'EMPTY',
      activity: entry.manualContext?.activity || 'EMPTY',
      pm25: pmData.pm25.toFixed(1),
      timestamp: new Date().toISOString()
    });

    this.state = {
      ...this.state,
      recordingData: [...this.state.recordingData, entry],
    };

    // Send data to Service Worker for background storage
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        if (registration.active) {
          registration.active.postMessage({
            type: 'STORE_BACKGROUND_DATA',
            payload: entry,
          });
          logger.debug('📤 Data sent to Service Worker for background storage');
        }
      }).catch(error => {
        logger.warn('⚠️ Failed to send data to Service Worker:', error);
      });
    }

    this.notify();
    
    logger.debug('📊 Data point added. Total entries:', this.state.recordingData.length);
  }

  updateMissionContext(location: string, activity: string): void {
    this.state = {
      ...this.state,
      missionContext: { location, activity },
    };

    this.notify();
    
    logger.debug('🏷️ Mission context updated:', { location, activity });
  }

  clearRecordingData(): void {
    this.state = {
      ...this.state,
      recordingData: [],
      recordingStartTime: null, // Clear start time when data is cleared
    };

    // Reset throttle timer when clearing data
    this.lastAddTime = 0;

    this.notify();
    
    logger.debug('🧹 Recording data cleared');
  }

  // Utility methods
  getRecordingDuration(): number {
    if (!this.state.recordingStartTime) return 0;
    return Date.now() - this.state.recordingStartTime.getTime();
  }

  getDataPointCount(): number {
    return this.state.recordingData.length;
  }

  getLatestDataPoint(): RecordingEntry | null {
    const data = this.state.recordingData;
    return data.length > 0 ? data[data.length - 1] : null;
  }

  getAverageValues(): { pm1: number; pm25: number; pm10: number } | null {
    if (this.state.recordingData.length === 0) return null;

    const totals = this.state.recordingData.reduce(
      (acc, entry) => ({
        pm1: acc.pm1 + entry.pmData.pm1,
        pm25: acc.pm25 + entry.pmData.pm25,
        pm10: acc.pm10 + entry.pmData.pm10,
      }),
      { pm1: 0, pm25: 0, pm10: 0 }
    );

    const count = this.state.recordingData.length;
    return {
      pm1: totals.pm1 / count,
      pm25: totals.pm25 / count,
      pm10: totals.pm10 / count,
    };
  }

  exportData(): RecordingEntry[] {
    return [...this.state.recordingData];
  }
}

// Export singleton instance
export const recordingService = RecordingService.getInstance();