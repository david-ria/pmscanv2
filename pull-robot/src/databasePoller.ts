import { logger } from './logger.js';
import { config } from './config.js';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(config.supabase.url, config.supabase.key);

export interface PendingMission {
  id: string;
  device_name: string | null;
  start_time: string;
  end_time: string;
  measurements_count: number;
}

export interface ProcessingStats {
  scanned: number;
  processed: number;
  failed: number;
  skipped: number;
}

let processingStats: ProcessingStats = {
  scanned: 0,
  processed: 0,
  failed: 0,
  skipped: 0
};

/**
 * Test database connection
 */
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('missions').select('id').limit(1);
    if (error) {
      logger.error('Database connection test failed:', { error: error instanceof Error ? error.message : 'Unknown error' });
      return false;
    }
    logger.info('✅ Database connection successful');
    return true;
  } catch (error) {
    logger.error('Database connection test error:', error);
    return false;
  }
}

/**
 * Get pending missions that need to be processed by the robot
 */
export async function getPendingMissions(): Promise<PendingMission[]> {
  try {
    const { data, error } = await supabase
      .from('missions')
      .select('id, device_name, start_time, end_time, measurements_count')
      .eq('processed_by_robot', false)
      .not('device_name', 'is', null)
      .gt('measurements_count', 0)
      .order('created_at', { ascending: true })
      .limit(config.processing.batchSize);

    if (error) {
      logger.error('Failed to fetch pending missions:', { error: error.message });
      return [];
    }

    // Filter by allowed device IDs
    const filteredMissions = data?.filter(mission => {
      return mission.device_name && (config.processing.allowDeviceIds?.includes(mission.device_name) ?? true);
    }) || [];

    processingStats.scanned += data?.length || 0;

    logger.info(`Found ${filteredMissions.length} pending missions to process`);
    return filteredMissions;
  } catch (error) {
    logger.error('Error fetching pending missions:', { error: error.message });
    return [];
  }
}

/**
 * Mark mission as processed
 */
export async function markMissionAsProcessed(missionId: string, success: boolean): Promise<void> {
  try {
    const updateData: any = {
      robot_processed_at: new Date().toISOString(),
      robot_processing_attempts: config.processing.maxAttempts
    };

    if (success) {
      updateData.processed_by_robot = true;
      processingStats.processed += 1;
    } else {
      // Increment attempts, but don't mark as processed if still under max attempts
      const { data: mission } = await supabase
        .from('missions')
        .select('robot_processing_attempts')
        .eq('id', missionId)
        .single();

      const currentAttempts = mission?.robot_processing_attempts || 0;
      const newAttempts = currentAttempts + 1;

      if (newAttempts >= config.processing.maxAttempts) {
        updateData.processed_by_robot = true; // Mark as processed to avoid infinite retries
        processingStats.failed += 1;
        logger.warn(`Mission ${missionId} failed after ${newAttempts} attempts`);
      }

      updateData.robot_processing_attempts = newAttempts;
    }

    const { error } = await supabase
      .from('missions')
      .update(updateData)
      .eq('id', missionId);

    if (error) {
      logger.error(`Failed to mark mission ${missionId} as processed:`, error);
    } else {
      logger.info(`Mission ${missionId} marked as ${success ? 'successfully processed' : 'failed'}`);
    }
  } catch (error) {
    logger.error(`Error marking mission ${missionId} as processed:`, { error: error.message });
  }
}

/**
 * Get processing statistics
 */
export function getProcessingStats(): ProcessingStats {
  return { ...processingStats };
}

/**
 * Reset processing statistics
 */
export function resetProcessingStats(): void {
  processingStats = {
    scanned: 0,
    processed: 0,
    failed: 0,
    skipped: 0
  };
}