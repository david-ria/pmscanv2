import { useEffect } from 'react';
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
        // Check for interrupted recording data
        const recoveryDataStr = localStorage.getItem(CRASH_RECOVERY_KEY);
        if (recoveryDataStr) {
          const recoveryData: RecoveryData = JSON.parse(recoveryDataStr);
          
          // Convert timestamps back to Date objects
          const restoredRecordingData = recoveryData.recordingData.map(entry => ({
            ...entry,
            pmData: {
              ...entry.pmData,
              timestamp: new Date(entry.pmData.timestamp)
            }
          }));
          
          // If recovery data is less than 24 hours old and has meaningful data
          const isRecent = Date.now() - recoveryData.timestamp < 24 * 60 * 60 * 1000;
          const hasData = restoredRecordingData.length > 0;
          
          if (isRecent && hasData) {
            logger.debug('🔄 Found crash recovery data, auto-saving mission...');
            
            try {
              // Create unique mission name with timestamp to avoid duplicates
              const startTime = new Date(recoveryData.startTime);
              const crashMissionName = `Recovered Mission ${startTime.toISOString().replace(/[:.]/g, '-')}`;
              
              // Check if a mission with this exact name already exists to prevent duplicates
              const existingMissions = await dataStorage.getAllMissions();
              const duplicateExists = existingMissions.some(mission => mission.name === crashMissionName);
              
              if (duplicateExists) {
                logger.debug('🔄 Crash recovery mission already exists, skipping...');
                localStorage.removeItem(CRASH_RECOVERY_KEY);
                return;
              }
              
              // Create a temporary mission from recovery data with unique ID
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

              // Export to CSV and attempt sync
              dataStorage.exportMissionToCSV(mission);
              
              if (navigator.onLine) {
                try {
                  dataStorage.saveMissionLocally(mission);
                  await dataStorage.syncPendingMissions();
                  dataStorage.clearLocalStorage();
                } catch (syncError) {
                  console.warn('Failed to sync recovered mission, but CSV exported');
                }
              }
              
              logger.debug('✅ Crash recovery mission saved successfully');
            } catch (error) {
              console.error('Failed to save crash recovery mission:', error);
              // Keep the recovery data for manual intervention
              return;
            }
          }
          
          // Clear recovery data after successful processing or if too old
          localStorage.removeItem(CRASH_RECOVERY_KEY);
        }

        // Check for unsent CSV files
        const unsentCSVs = getUnsentCSVs();
        if (unsentCSVs.length > 0) {
          logger.debug(`📤 Found ${unsentCSVs.length} unsent CSV files, attempting to sync...`);
          
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

        // Trigger regular sync of any pending missions
        if (navigator.onLine) {
          await dataStorage.syncPendingMissions();
        }

      } catch (error) {
        console.error('Error during crash recovery:', error);
      }
    };

    // Run crash recovery check on app launch
    checkCrashRecovery();
  }, [saveMission]);

  // Save recording data for crash recovery
  const saveRecordingProgress = (
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
    } catch (error) {
      console.warn('Failed to save recording progress for crash recovery:', error);
    }
  };

  // Clear recovery data when recording is properly saved
  const clearRecoveryData = () => {
    localStorage.removeItem(CRASH_RECOVERY_KEY);
  };

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
  const unsentCSVs = getUnsentCSVs().filter(csv => csv.filename !== filename);
  localStorage.setItem(UNSENT_CSV_KEY, JSON.stringify(unsentCSVs));
}

async function syncCSVToServer(csvData: UnsentCSV): Promise<void> {
  // This would ideally send to your server endpoint
  // For now, we'll trigger the sync of pending missions instead
  logger.debug(`📡 Attempting to sync CSV: ${csvData.filename}`);
  
  // If online, try to sync any pending missions
  if (navigator.onLine) {
    await dataStorage.syncPendingMissions();
  } else {
    throw new Error('Device is offline, cannot sync CSV');
  }
}

// Export function to store CSV data for later sync
export function storeCSVForSync(filename: string, content: string) {
  saveUnsentCSV(filename, content);
  logger.debug(`💾 Stored CSV for later sync: ${filename}`);
}
