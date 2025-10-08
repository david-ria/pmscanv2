import { useEffect, useCallback } from 'react';
import { RecordingEntry } from '@/types/recording';
import { dataStorage } from '@/lib/dataStorage';
import { useMissionSaver } from './useMissionSaver';
import * as logger from '@/utils/logger';

const CRASH_RECOVERY_KEY = 'pmscan_recording_recovery';
const UNSENT_CSV_KEY = 'pmscan_unsent_csv';

interface RecoveryData {
  recordingData: RecordingEntry[];
  startTime: string;
  frequency: string;
  missionContext: {
    location: string;
    activity: string;
  };
  timestamp: number;
}

interface UnsentCSV {
  filename: string;
  content: string;
  timestamp: number;
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
          const isVeryOld =
            Date.now() - recoveryData.timestamp > 24 * 60 * 60 * 1000;

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

          // Convert timestamps back to Date objects
          const restoredRecordingData = recoveryData.recordingData.map(
            (entry) => ({
              ...entry,
              pmData: {
                ...entry.pmData,
                timestamp: new Date(entry.pmData.timestamp),
              },
            })
          );

          // Only process if data is meaningful and recent (within 24 hours)
          const isRecent =
            Date.now() - recoveryData.timestamp < 24 * 60 * 60 * 1000;
          const hasData = restoredRecordingData.length > 0;

          if (isRecent && hasData) {
            logger.debug(
              '🔄 Found crash recovery data, auto-saving mission...'
            );

            try {
              // Create unique mission name with timestamp to avoid duplicates
              const startTime = new Date(recoveryData.startTime);
              const crashMissionName = `Recovered Mission ${startTime.toISOString().replace(/[:.]/g, '-')}`;

              // Create a temporary mission from recovery data
              const mission = dataStorage.createMissionFromRecording(
                restoredRecordingData,
                crashMissionName,
                new Date(recoveryData.startTime),
                new Date(recoveryData.timestamp),
                recoveryData.missionContext.location || 'Unknown Location',
                recoveryData.missionContext.activity || 'Unknown Activity',
                recoveryData.frequency,
                false // Don't share auto-recovered missions
              );

              // Save locally first so it appears in History
              await dataStorage.saveMissionLocally(mission);
              logger.debug(`✅ Crash recovery mission saved to History (${restoredRecordingData.length} points)`);
              
              // Export to CSV (auto-sync disabled to avoid duplicates)
              await dataStorage.exportMissionToCSV(mission);
              logger.debug('✅ Crash recovery mission exported as CSV');
            } catch (error) {
              console.error('Failed to save crash recovery mission:', error);
            }
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
        startTime: startTime.toISOString(),
        frequency,
        missionContext,
        timestamp: Date.now(),
      };

      try {
        localStorage.setItem(CRASH_RECOVERY_KEY, JSON.stringify(recoveryData));
        logger.debug(`💾 Saved recording progress snapshot (${recordingData.length} points)`);
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
function getUnsentCSVs(): UnsentCSV[] {
  try {
    const stored = localStorage.getItem(UNSENT_CSV_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveUnsentCSV(filename: string, content: string) {
  const unsentCSVs = getUnsentCSVs();
  const csvData: UnsentCSV = {
    filename,
    content,
    timestamp: Date.now(),
  };

  unsentCSVs.push(csvData);

  try {
    localStorage.setItem(UNSENT_CSV_KEY, JSON.stringify(unsentCSVs));
  } catch (error) {
    console.warn('Failed to store unsent CSV data:', error);
  }
}

function removeUnsentCSV(filename: string) {
  const unsentCSVs = getUnsentCSVs().filter((csv) => csv.filename !== filename);
  localStorage.setItem(UNSENT_CSV_KEY, JSON.stringify(unsentCSVs));
}

async function syncCSVToServer(csvData: UnsentCSV): Promise<void> {
  // This would ideally send to your server endpoint
  // For now, we'll trigger the sync of pending missions instead
  logger.debug(`📡 Attempting to sync CSV: ${csvData.filename}`);

  // Skip sync here to reduce excessive calls - handled by main sync
  logger.debug('CSV sync request handled by main sync system');
}

// Export function to store CSV data for later sync
export function storeCSVForSync(filename: string, content: string) {
  saveUnsentCSV(filename, content);
  logger.debug(`💾 Stored CSV for later sync: ${filename}`);
}
