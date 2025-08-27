import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';
import { createLogger } from './logger.js';

const logger = createLogger('database-poller');
const supabase = createClient(config.supabase.url, config.supabase.key);

export interface PendingMission {
  id: string;
  device_name: string;
  start_time: string;
  end_time: string;
  measurements_count: number;
}

interface ProcessingStats {
  scanned: number;
  processed: number;
  failed: number;
}

const processingStats: ProcessingStats = {
  scanned: 0,
  processed: 0,
  failed: 0,
};

export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('missions')
      .select('count')
      .limit(1);

    if (error) {
      logger.error('Database connection test failed:', error);
      return false;
    }

    logger.info('✅ Database connection successful');
    return true;
  } catch (error) {
    logger.error('Database connection test failed:', error);
    return false;
  }
}

export async function getPendingMissions(): Promise<PendingMission[]> {
  try {
    const { data, error } = await supabase
      .from('missions')
      .select('id, device_name, start_time, end_time, measurements_count')
      .eq('processed_by_robot', false)
      .not('device_name', 'is', null)
      .gt('measurements_count', 0)
      .order('created_at', { ascending: true })
      .limit(config.polling.batchSize);

    if (error) {
      logger.error('Failed to fetch pending missions:', error);
      return [];
    }

    // Filter by allowed device IDs if configured
    const filteredMissions = data?.filter((mission: any) => {
      return mission.device_name && config.processing.allowDeviceIds.includes(mission.device_name);
    }) || [];

    processingStats.scanned += data?.length || 0;

    logger.info(`Found ${filteredMissions.length} pending missions to process`);
    return filteredMissions;

  } catch (error) {
    logger.error('Error fetching pending missions:', error);
    return [];
  }
}

export async function markMissionAsProcessed(missionId: string, success: boolean): Promise<void> {
  try {
    const updateData: any = {
      robot_processed_at: new Date().toISOString(),
    };

    if (success) {
      updateData.processed_by_robot = true;
      processingStats.processed += 1;
    } else {
      processingStats.failed += 1;
    }

    const { error } = await supabase
      .from('missions')
      .update(updateData)
      .eq('id', missionId);

    if (error) {
      logger.error(`Error marking mission ${missionId} as processed:`, error);
    } else {
      logger.info(`Mission ${missionId} marked as ${success ? 'processed' : 'failed'}`);
    }
  } catch (error) {
    logger.error(`Error marking mission ${missionId} as processed:`, error);
  }
}

export function getProcessingStats(): ProcessingStats {
  return { ...processingStats };
}

export function resetProcessingStats(): void {
  processingStats.scanned = 0;
  processingStats.processed = 0;
  processingStats.failed = 0;
}