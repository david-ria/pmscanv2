import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';
import { logger } from './logger.js';

const supabase = createClient(config.supabase.url, config.supabase.key);

export interface PendingMission {
  id: string;
  device_name: string;
  start_time: string;
  end_time: string;
  measurements_count: number;
}

// Processing statistics
let scannedMissions = 0;
let processedMissions = 0;
let failedMissions = 0;

export interface ProcessingStats {
  scanned: number;
  processed: number;
  failed: number;
}

export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('missions')
      .select('id')
      .limit(1);
    
    if (error) {
      logger.error('Database connection test failed:', { error: error.message });
      return false;
    }
    
    logger.info('✅ Database connection successful');
    return true;
  } catch (error: any) {
    logger.error('Database connection test failed:', { error: error.message });
    return false;
  }
}

export async function getPendingMissions(): Promise<PendingMission[]> {
  try {
    scannedMissions++;
    
    const { data, error } = await supabase
      .from('missions')
      .select('*')
      .is('robot_processed_at', null)
      .not('device_name', 'is', null)
      .gt('measurements_count', 0)
      .order('created_at', { ascending: true })
      .limit(config.processing.batchSize);

    if (error) {
      logger.error('Error fetching pending missions:', { error: error.message });
      return [];
    }

    // Filter by allowed device IDs if configured
    const filteredMissions = data?.filter((mission: any) => {
      return mission.device_name && config.processing.allowDeviceIds.includes(mission.device_name);
    }) || [];

    logger.info(`Found ${filteredMissions.length} pending missions`);
    return filteredMissions;

  } catch (error: any) {
    logger.error('Error fetching pending missions:', { error: error.message });
    return [];
  }
}

export async function markMissionAsProcessed(missionId: string, success: boolean): Promise<void> {
  try {
    const { error } = await supabase
      .from('missions')
      .update({ 
        robot_processed_at: new Date().toISOString(),
        robot_success: success
      })
      .eq('id', missionId);

    if (error) {
      logger.error(`Error marking mission ${missionId} as processed:`, { error: error.message });
      failedMissions++;
    } else {
      if (success) {
        processedMissions++;
      } else {
        failedMissions++;
      }
      logger.info(`Mission ${missionId} marked as ${success ? 'successful' : 'failed'}`);
    }
  } catch (error: any) {
    logger.error(`Error marking mission ${missionId} as processed:`, { error: error.message });
    failedMissions++;
  }
}

export function getProcessingStats(): ProcessingStats {
  return {
    scanned: scannedMissions,
    processed: processedMissions,
    failed: failedMissions
  };
}

export function resetProcessingStats(): void {
  scannedMissions = 0;
  processedMissions = 0;
  failedMissions = 0;
}