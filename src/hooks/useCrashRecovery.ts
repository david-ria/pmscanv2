import { useEffect, useCallback } from 'react';
import { RecordingEntry } from '@/types/recording';
import { dataStorage } from '@/lib/dataStorage';
import { useMissionSaver } from './useMissionSaver';
import * as logger from '@/utils/logger';

const CRASH_RECOVERY_KEY = 'pmscan_recording_recovery';
const UNSENT_CSV_KEY = 'pmscan_unsent_csv';

interface RecoveryData {
  recordingData: RecordingEntry[];
  recordingStartTime: Date | null;
  frequency: string;
  missionContext: {
    location: string;
    activity: string;
  };
  timestamp: Date;
}

interface UnsentCSV {
  filename: string;
  content: string;
  timestamp: Date;
  retryCount?: number;
}

// Export function for external use (like RecordingService)
export function saveRecordingProgressToStorage(data: RecoveryData): void {
  try {
    localStorage.setItem(CRASH_RECOVERY_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save recording progress:', error);
  }
}

export function useCrashRecovery() {
  const { saveMission } = useMissionSaver();

  // Check for crash recovery on app launch
  useEffect(() => {
    const checkCrashRecovery = async () => {
      try {
        // First, clean up any very old recovery data (older than 24 hours)
        const recoveryDataStr = localStorage.getItem(CRASH_RECOVERY_KEY);
        if (recoveryDataStr) {
          const recoveryData: RecoveryData = JSON.parse(recoveryDataStr);
          const timestampDate = new Date(recoveryData.timestamp);
          const isVeryOld = !timestampDate.getTime || 
            Date.now() - timestampDate.getTime() > 24 * 60 * 60 * 1000;

          if (isVeryOld) {
            logger.debug('🧹 Clearing old crash recovery data (>24h)');
            localStorage.removeItem(CRASH_RECOVERY_KEY);
            return;
          }
        }

        // Skip clearing local storage during crash recovery to prevent more sync issues
        if (navigator.onLine) {
          logger.debug(
            '🧹 Online - but skipping storage clear to prevent sync loops'
          );
        }

        // Check for interrupted recording data
        if (recoveryDataStr) {
          const recoveryData: RecoveryData = JSON.parse(recoveryDataStr);

          // Convert timestamps back to Date objects safely
          const restoredRecordingData = recoveryData.recordingData.map(
            (entry) => ({
              ...entry,
              pmData: {
                ...entry.pmData,
                timestamp: entry.pmData.timestamp instanceof Date 
                  ? entry.pmData.timestamp 
                  : new Date(entry.pmData.timestamp),
              },
            })
          );

          // Only process if data is meaningful and recent (within 24 hours)
          const recoveryTimestamp = new Date(recoveryData.timestamp);
          const isRecent = recoveryTimestamp.getTime && 
            Date.now() - recoveryTimestamp.getTime() < 24 * 60 * 60 * 1000;
          const hasData = restoredRecordingData.length > 0;

          if (isRecent && hasData) {
            logger.debug(
              '🔄 Found crash recovery data, auto-saving mission...'
            );

        // Create and save the recovered mission with safe date handling
        const startTime = recoveryData.recordingStartTime 
          ? (recoveryData.recordingStartTime instanceof Date 
             ? recoveryData.recordingStartTime 
             : new Date(recoveryData.recordingStartTime))
          : null;
        
        const mission = await saveMission(
          restoredRecordingData,
          startTime,
          `Recovered-${new Date().toISOString().slice(0, 16)}`,
          recoveryData.missionContext.location,
          recoveryData.missionContext.activity,
          recoveryData.frequency
        );

        // Store the CSV for sync (simplified version without createMissionCSV dependency)
        const csvFilename = `recovered_${mission.id}_${Date.now()}.csv`;
        await storeCSVForSync(csvFilename, `Mission ID: ${mission.id}, Data Points: ${recoveryData.recordingData.length}`);

        // Show user notification about recovery
        import('sonner').then(({ toast }) => {
          toast.success('Mission recovered successfully', {
            description: `Recovered ${recoveryData.recordingData.length} data points from interrupted session`,
            duration: 5000,
          });
        });

        console.log('✅ Successfully recovered mission:', mission.id);
        clearRecoveryData();
          }

          // Always clear recovery data after processing
          localStorage.removeItem(CRASH_RECOVERY_KEY);
        }

        // Check for unsent CSV files
        const unsentCSVs = getUnsentCSVs();
        if (unsentCSVs.length > 0) {
          logger.debug(
            `📤 Found ${unsentCSVs.length} unsent CSV files, attempting to sync...`
          );

          for (const csvData of unsentCSVs) {
            try {
              await syncCSVToServer(csvData);
              removeUnsentCSV(csvData.filename);
              logger.debug(`✅ Successfully synced CSV: ${csvData.filename}`);
            } catch (error) {
              console.error(`Failed to sync CSV ${csvData.filename}:`, error);
              // Keep unsent CSV for next attempt
            }
          }
        }

        // Skip automatic sync during crash recovery to prevent loops
        logger.debug(
          '🚫 Skipping auto-sync during crash recovery to prevent loops'
        );
      } catch (error) {
        console.error('Error during crash recovery:', error);
      }
    };

    // Run crash recovery check on app launch
    checkCrashRecovery();
  }, [saveMission]);

  // Save recording data for crash recovery
  const saveRecordingProgress = useCallback(
    (
      recordingData: RecordingEntry[],
      startTime: Date | null,
      frequency: string,
      missionContext: { location: string; activity: string }
    ) => {
      if (!startTime || recordingData.length === 0) {
        // Clear recovery data if no meaningful recording in progress
        localStorage.removeItem(CRASH_RECOVERY_KEY);
        return;
      }

      const recoveryData: RecoveryData = {
        recordingData,
        recordingStartTime: startTime,
        frequency,
        missionContext,
        timestamp: new Date(),
      };

      try {
        localStorage.setItem(CRASH_RECOVERY_KEY, JSON.stringify(recoveryData));
      } catch (error) {
        console.warn(
          'Failed to save recording progress for crash recovery:',
          error
        );
      }
    },
    []
  );

  // Clear recovery data when recording is properly saved
  const clearRecoveryData = useCallback(() => {
    localStorage.removeItem(CRASH_RECOVERY_KEY);
  }, []);

  return {
    saveRecordingProgress,
    clearRecoveryData,
  };
}

// Helper functions for CSV management
export function getUnsentCSVs(): UnsentCSV[] {
  try {
    const keys = Object.keys(localStorage).filter(key => key.startsWith(`${UNSENT_CSV_KEY}_`));
    return keys.map(key => {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...parsed,
          timestamp: new Date(parsed.timestamp)
        };
      }
      return null;
    }).filter(Boolean) as UnsentCSV[];
  } catch {
    return [];
  }
}

function saveUnsentCSV(filename: string, content: string, retryCount: number = 0): void {
  try {
    const unsentData: UnsentCSV = {
      filename,
      content,
      timestamp: new Date(),
      retryCount
    };
    localStorage.setItem(`${UNSENT_CSV_KEY}_${filename}`, JSON.stringify(unsentData));
  } catch (error) {
    console.error('Failed to save unsent CSV:', error);
  }
}

function removeUnsentCSV(filename: string): void {
  try {
    localStorage.removeItem(`${UNSENT_CSV_KEY}_${filename}`);
  } catch (error) {
    console.error('Failed to remove unsent CSV:', error);
  }
}

async function syncCSVToServer(csvData: UnsentCSV): Promise<boolean> {
  try {
    // This would ideally send to your server endpoint
    // For now, we'll simulate the sync process
    logger.debug(`📡 Attempting to sync CSV: ${csvData.filename}`);
    
    // Simulate network request
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate 80% success rate for testing
    const success = Math.random() > 0.2;
    
    if (success) {
      logger.debug(`✅ Successfully synced CSV: ${csvData.filename}`);
    } else {
      logger.warn(`⚠️ Failed to sync CSV: ${csvData.filename}`);
    }
    
    return success;
  } catch (error) {
    logger.error(`❌ Error syncing CSV ${csvData.filename}:`, error);
    return false;
  }
}

export const storeCSVForSync = (filename: string, content: string): Promise<void> => {
  return new Promise((resolve) => {
    saveUnsentCSV(filename, content);
    resolve();
  });
};

// Export additional functions for PendingSyncIndicator
export function retryCSVSync(filename: string): Promise<boolean> {
  return new Promise(async (resolve) => {
    try {
      const csvData = getUnsentCSVs().find(csv => csv.filename === filename);
      if (!csvData) {
        resolve(false);
        return;
      }

      const success = await syncCSVToServer(csvData);
      if (success) {
        removeUnsentCSV(filename);
        resolve(true);
      } else {
        // Increment retry count
        saveUnsentCSV(filename, csvData.content, (csvData.retryCount || 0) + 1);
        resolve(false);
      }
    } catch (error) {
      console.error('Error retrying CSV sync:', error);
      resolve(false);
    }
  });
}

export function clearAllUnsentCSVs(): void {
  const csvs = getUnsentCSVs();
  csvs.forEach(csv => removeUnsentCSV(csv.filename));
}
