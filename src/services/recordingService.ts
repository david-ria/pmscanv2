import { useState, useCallback, useRef } from 'react';
import { PMScanData } from '@/lib/pmscan/types';
import { LocationData } from '@/types/PMScan';
import { RecordingEntry, MissionContext } from '@/types/recording';
import { setGlobalRecording, setBackgroundRecording } from '@/lib/pmscan/globalConnectionManager';
import * as logger from '@/utils/logger';

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
    context?: MissionContext,
    automaticContext?: string,
    enrichedLocation?: string // NEW parameter
  ) => void;
  updateMissionContext: (location: string, activity: string) => void;
  clearRecordingData: () => void;
  saveMission: (
    missionName: string,
    locationContext?: string,
    activityContext?: string,
    recordingFrequency?: string,
    shared?: boolean,
    explicitRecordingData?: any[]
  ) => Promise<any>; // Add saveMission method
}

class RecordingService {
  private static instance: RecordingService;
  private listeners: Set<(state: RecordingState) => void> = new Set();
  
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

  startRecording(frequency: string = '10s'): void {
    logger.debug('🎬 === RECORDING SERVICE startRecording() CALLED ===');
    logger.debug('🎬 Input frequency:', frequency);
    logger.debug('🎬 Current state before update:', JSON.stringify(this.state, null, 2));
    
    this.state = {
      ...this.state,
      isRecording: true,
      recordingFrequency: frequency,
      recordingStartTime: new Date(),
      recordingData: [], // Clear previous data
    };

    logger.debug('🎬 New state after update:', JSON.stringify(this.state, null, 2));

    // Enable both global and background recording for continuity
    setGlobalRecording(true);
    setBackgroundRecording(true);
    
    // Enable background collection via service worker
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'START_BACKGROUND_RECORDING',
        frequency,
      });
      logger.debug('🎬 Service worker message sent');
    }
    
    logger.debug('🎬 About to notify listeners:', this.listeners.size, 'listeners');
    this.notify();
    
    logger.debug('✅ Recording started! Final isRecording state:', this.state.isRecording);
  }

  stopRecording(): void {
    console.log('🚨🛑 === RECORDING SERVICE STOP CALLED ===');
    console.log('🛑 Recording service stop - current state:', {
      isRecording: this.state.isRecording,
      recordingDataLength: this.state.recordingData.length,
      hasRecordingStartTime: !!this.state.recordingStartTime,
      recordingStartTime: this.state.recordingStartTime
    });
    logger.debug('🛑 Stopping recording...');
    
    this.state = {
      ...this.state,
      isRecording: false,
      // Keep recordingStartTime for mission saving - will be cleared when data is cleared
    };

    // Disable both global and background recording
    setGlobalRecording(false);
    setBackgroundRecording(false);
    
    // Stop background collection via service worker
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'STOP_BACKGROUND_RECORDING',
      });
    }
    
    this.notify();
    
    console.log('🚨🛑 === RECORDING SERVICE STOP COMPLETE ===');
    logger.debug('✅ Recording stopped successfully');
  }

  addDataPoint(
    pmData: PMScanData,
    location?: LocationData,
    context?: MissionContext,
    automaticContext?: string,
    enrichedLocation?: string // NEW parameter
  ): void {
    if (!this.state.isRecording) {
      logger.debug('⚠️ Attempted to add data point while not recording');
      return;
    }

    const entry: RecordingEntry = {
      pmData,
      location,
      context: context || this.state.missionContext,
      automaticContext,
      enrichedLocation, // NEW: Store location enrichment separately
      timestamp: pmData.timestamp, // Use PMScan timestamp (already standardized via createTimestamp)
    };

    this.state = {
      ...this.state,
      recordingData: [...this.state.recordingData, entry],
    };

    this.notify();
    
    console.log('🚨✅ === UNIFIED RECORDING SYSTEM ===');
    logger.debug('📊 Data point added to UNIFIED RecordingService. Total entries:', this.state.recordingData.length);
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

  async saveMission(
    missionName: string,
    locationContext?: string,
    activityContext?: string,
    recordingFrequency?: string,
    shared?: boolean,
    explicitRecordingData?: any[]
  ): Promise<any> {
    console.log('🚨💾 === RECORDING SERVICE SAVE MISSION ===');
    console.log('💾 RecordingService.saveMission called with:', {
      missionName,
      explicitDataLength: explicitRecordingData?.length,
      stateDataLength: this.state.recordingData.length,
      hasRecordingStartTime: !!this.state.recordingStartTime,
      recordingStartTime: this.state.recordingStartTime?.toISOString(),
      shared
    });

    // Use explicit data first, then current state
    const dataToSave = explicitRecordingData || this.state.recordingData;
    const startTimeToUse = this.state.recordingStartTime;

    if (!startTimeToUse || dataToSave.length === 0) {
      console.error('🚨❌ === MISSION SAVE FAILED - NO DATA ===');
      console.error('❌ Cannot save mission: missing data or start time:', {
        hasStartTime: !!startTimeToUse,
        dataLength: dataToSave.length
      });
      throw new Error('No recording data available to save');
    }

    try {
      // Calculate mission statistics
      const endTime = new Date();
      const durationMinutes = Math.max(1, Math.round((endTime.getTime() - startTimeToUse.getTime()) / (1000 * 60)));
      
      // Calculate averages and max values
      const pmValues = dataToSave.map(entry => entry.pmData);
      const avgPm1 = pmValues.reduce((sum, pm) => sum + pm.pm1, 0) / pmValues.length;
      const avgPm25 = pmValues.reduce((sum, pm) => sum + pm.pm25, 0) / pmValues.length;
      const avgPm10 = pmValues.reduce((sum, pm) => sum + pm.pm10, 0) / pmValues.length;
      const maxPm25 = Math.max(...pmValues.map(pm => pm.pm25));

      // Create measurements data
      const measurements = dataToSave.map((entry, index) => ({
        id: `${entry.pmData.timestamp.getTime()}-${index}`,
        timestamp: entry.timestamp,
        pm1: entry.pmData.pm1,
        pm25: entry.pmData.pm25,
        pm10: entry.pmData.pm10,
        temperature: entry.pmData.temp,
        humidity: entry.pmData.humidity,
        latitude: entry.location?.latitude,
        longitude: entry.location?.longitude,
        accuracy: entry.location?.accuracy,
        locationContext: entry.context?.location || locationContext || '',
        activityContext: entry.context?.activity || activityContext || '',
        automaticContext: entry.automaticContext,
        enrichedLocation: entry.enrichedLocation
      }));

      // Create mission object compatible with existing system
      const missionData = {
        id: crypto.randomUUID(),
        name: missionName,
        startTime: startTimeToUse,
        endTime,
        durationMinutes,
        avgPm1,
        avgPm25,
        avgPm10,
        maxPm25,
        measurementsCount: dataToSave.length,
        locationContext,
        activityContext,
        recordingFrequency: recordingFrequency || '10s',
        shared: shared || false,
        measurements,
        synced: false
      };

      // Export mission to CSV using existing functionality
      const { exportMissionToCSV } = await import('@/lib/csvExport');
      await exportMissionToCSV(missionData);

      console.log('🚨✅ === MISSION SAVED SUCCESSFULLY ===');
      console.log('✅ Mission exported to CSV, now clearing recording data');

      // Clear recording data after successful save
      this.clearRecordingData();
      console.log('🗑️ Recording data cleared');

      return missionData;
    } catch (error) {
      console.error('❌ Error saving mission:', error);
      throw error;
    }
  }

  exportData(): RecordingEntry[] {
    return [...this.state.recordingData];
  }
}

// Export singleton instance
export const recordingService = RecordingService.getInstance();