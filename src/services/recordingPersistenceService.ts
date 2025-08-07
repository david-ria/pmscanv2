import { RecordingState, RecordingActions } from './recordingService';
import * as logger from '@/utils/logger';

const RECORDING_PERSISTENCE_KEY = 'pmscan_recording_persistence';
const PERSISTENCE_SYNC_INTERVAL = 3000; // 3 seconds

interface PersistedRecordingState {
  isRecording: boolean;
  recordingFrequency: string;
  missionContext: {
    location: string;
    activity: string;
  };
  recordingStartTime: string | null;
  lastSyncTime: number;
  currentMissionId: string | null;
}

class RecordingPersistenceService {
  private static instance: RecordingPersistenceService;
  private syncInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;

  static getInstance(): RecordingPersistenceService {
    if (!RecordingPersistenceService.instance) {
      RecordingPersistenceService.instance = new RecordingPersistenceService();
    }
    return RecordingPersistenceService.instance;
  }

  /**
   * Initialize persistence system and check for interrupted recordings
   */
  async initialize(): Promise<{ shouldRestore: boolean; persistedState?: PersistedRecordingState }> {
    if (this.isInitialized) return { shouldRestore: false };
    
    this.isInitialized = true;
    logger.debug('🔄 Initializing recording persistence service');

    try {
      const persistedData = localStorage.getItem(RECORDING_PERSISTENCE_KEY);
      if (!persistedData) {
        return { shouldRestore: false };
      }

      const persistedState: PersistedRecordingState = JSON.parse(persistedData);
      
      // Check if we have an interrupted recording (within last 2 hours)
      const timeSinceLastSync = Date.now() - persistedState.lastSyncTime;
      const isRecentRecording = timeSinceLastSync < 2 * 60 * 60 * 1000; // 2 hours
      
      if (persistedState.isRecording && isRecentRecording) {
        logger.debug('🔄 Found interrupted recording, should restore:', persistedState);
        return { shouldRestore: true, persistedState };
      } else {
        // Clear old/stale data
        this.clearPersistedState();
        return { shouldRestore: false };
      }
    } catch (error) {
      logger.debug('⚠️ Error checking persisted recording state:', error);
      this.clearPersistedState();
      return { shouldRestore: false };
    }
  }

  /**
   * Start persistence tracking for active recording
   */
  startPersistence(
    recordingState: RecordingState & { currentMissionId?: string | null }
  ): void {
    if (!recordingState.isRecording) return;

    logger.debug('🔄 Starting recording persistence tracking');

    // Immediately save current state
    this.saveState(recordingState);

    // Set up periodic sync
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      this.saveState(recordingState);
    }, PERSISTENCE_SYNC_INTERVAL);
  }

  /**
   * Stop persistence tracking
   */
  stopPersistence(): void {
    logger.debug('🛑 Stopping recording persistence tracking');
    
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    this.clearPersistedState();
  }

  /**
   * Update persisted state
   */
  updateState(recordingState: RecordingState & { currentMissionId?: string | null }): void {
    if (recordingState.isRecording) {
      this.saveState(recordingState);
    } else {
      this.stopPersistence();
    }
  }

  /**
   * Restore recording from persisted state
   */
  async restoreRecording(
    persistedState: PersistedRecordingState,
    recordingActions: Pick<RecordingActions, 'startRecording' | 'updateMissionContext'>
  ): Promise<void> {
    try {
      logger.debug('🔄 Restoring interrupted recording:', persistedState);

      // Restore mission context first
      recordingActions.updateMissionContext(
        persistedState.missionContext.location,
        persistedState.missionContext.activity
      );

      // Start recording with the same frequency
      recordingActions.startRecording(persistedState.recordingFrequency);

      logger.debug('✅ Recording restoration completed');
    } catch (error) {
      logger.debug('⚠️ Failed to restore recording:', error);
      this.clearPersistedState();
    }
  }

  /**
   * Save current recording state to localStorage
   */
  private saveState(recordingState: RecordingState & { currentMissionId?: string | null }): void {
    try {
      const persistedState: PersistedRecordingState = {
        isRecording: recordingState.isRecording,
        recordingFrequency: recordingState.recordingFrequency,
        missionContext: recordingState.missionContext,
        recordingStartTime: recordingState.recordingStartTime?.toISOString() || null,
        lastSyncTime: Date.now(),
        currentMissionId: recordingState.currentMissionId || null,
      };

      localStorage.setItem(RECORDING_PERSISTENCE_KEY, JSON.stringify(persistedState));
      logger.debug('💾 Recording state persisted');
    } catch (error) {
      logger.debug('⚠️ Failed to persist recording state:', error);
    }
  }

  /**
   * Clear persisted state
   */
  private clearPersistedState(): void {
    try {
      localStorage.removeItem(RECORDING_PERSISTENCE_KEY);
      logger.debug('🧹 Cleared persisted recording state');
    } catch (error) {
      logger.debug('⚠️ Failed to clear persisted state:', error);
    }
  }

  /**
   * Check if there's an active persisted recording
   */
  hasActivePersistedRecording(): boolean {
    try {
      const persistedData = localStorage.getItem(RECORDING_PERSISTENCE_KEY);
      if (!persistedData) return false;

      const persistedState: PersistedRecordingState = JSON.parse(persistedData);
      const timeSinceLastSync = Date.now() - persistedState.lastSyncTime;
      const isRecentRecording = timeSinceLastSync < 2 * 60 * 60 * 1000; // 2 hours

      return persistedState.isRecording && isRecentRecording;
    } catch {
      return false;
    }
  }

  /**
   * Cleanup when app is closing
   */
  cleanup(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.isInitialized = false;
  }
}

// Export singleton instance
export const recordingPersistenceService = RecordingPersistenceService.getInstance();

// Auto-cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    recordingPersistenceService.cleanup();
  });
}