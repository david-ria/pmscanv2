import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';
import { logger } from './logger.js';

// Data structures
interface PendingMission {
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
  skipped: number;
}

// Initialize Supabase client
const supabase = createClient(config.supabase.url, config.supabase.key);

// Processing statistics
let processingStats: ProcessingStats = {
  scanned: 0,
  processed: 0,
  failed: 0,
  skipped: 0,
};

/**
 * Test database connection
 */
async function testDatabaseConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('missions')
      .select('id')
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

/**
 * Get pending missions from database
 */
async function getPendingMissions(): Promise<PendingMission[]> {
  try {
    let query = supabase
      .from('missions')
      .select('id, device_name, start_time, end_time, measurements_count')
      .is('robot_processed', null)
      .not('device_name', 'is', null)
      .gt('measurements_count', 0)
      .order('start_time', { ascending: true })
      .limit(config.polling.batchSize);

    // Apply device filtering if configured
    if (config.processing.allowDeviceIds && config.processing.allowDeviceIds.length > 0) {
      query = query.in('device_name', config.processing.allowDeviceIds);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Failed to fetch pending missions:', error);
      return [];
    }

    processingStats.scanned += data?.length || 0;
    logger.debug(`📊 Found ${data?.length || 0} pending missions`);
    
    return data || [];
  } catch (error) {
    logger.error('Error fetching pending missions:', error);
    return [];
  }
}

/**
 * Mark mission as processed in database
 */
async function markMissionAsProcessed(missionId: string, success: boolean): Promise<void> {
  try {
    const updates: any = {
      robot_processed: new Date().toISOString(),
      robot_attempts: 1,
    };

    if (!success) {
      updates.robot_error = 'Processing failed';
    }

    const { error } = await supabase
      .from('missions')
      .update(updates)
      .eq('id', missionId);

    if (error) {
      logger.error(`Failed to mark mission ${missionId} as processed:`, error);
      processingStats.failed++;
      return;
    }

    if (success) {
      processingStats.processed++;
      logger.debug(`✅ Mission ${missionId} marked as processed`);
    } else {
      processingStats.failed++;
      logger.debug(`❌ Mission ${missionId} marked as failed`);
    }
  } catch (error) {
    logger.error(`Error marking mission ${missionId} as processed:`, error);
    processingStats.failed++;
  }
}

/**
 * Get processing statistics
 */
function getProcessingStats(): ProcessingStats {
  return { ...processingStats };
}

/**
 * Reset processing statistics
 */
function resetProcessingStats(): void {
  processingStats = {
    scanned: 0,
    processed: 0,
    failed: 0,
    skipped: 0,
  };
}

export {
  testDatabaseConnection,
  getPendingMissions,
  markMissionAsProcessed,
  getProcessingStats,
  resetProcessingStats,
  type PendingMission,
  type ProcessingStats,
};