import { supabase } from '@/integrations/supabase/client';
import * as logger from '@/utils/logger';

export interface SyncStatus {
  isSynced: boolean;
  hasOrphanedData: boolean;
  measurementsMismatch: boolean;
  actualMeasurementCount?: number;
  expectedMeasurementCount?: number;
}

/**
 * Check sync status of a mission
 */
export async function checkMissionSyncStatus(missionId: string, expectedMeasurementCount: number): Promise<SyncStatus> {
  try {
    // Check if mission exists in database
    const { data: mission, error: missionError } = await supabase
      .from('missions')
      .select('id, measurements_count')
      .eq('id', missionId)
      .maybeSingle();

    if (missionError) {
      logger.error(`Error checking mission ${missionId}:`, missionError);
      return {
        isSynced: false,
        hasOrphanedData: false,
        measurementsMismatch: false,
      };
    }

    if (!mission) {
      return {
        isSynced: false,
        hasOrphanedData: false,
        measurementsMismatch: false,
      };
    }

    // Check actual measurements count
    const { count, error: countError } = await supabase
      .from('measurements')
      .select('*', { count: 'exact', head: true })
      .eq('mission_id', missionId);

    if (countError) {
      logger.error(`Error counting measurements for mission ${missionId}:`, countError);
      return {
        isSynced: false,
        hasOrphanedData: true,
        measurementsMismatch: false,
      };
    }

    const actualCount = count || 0;
    const measurementsMismatch = actualCount !== expectedMeasurementCount;
    const hasOrphanedData = actualCount === 0 && expectedMeasurementCount > 0;

    return {
      isSynced: actualCount === expectedMeasurementCount && actualCount > 0,
      hasOrphanedData,
      measurementsMismatch,
      actualMeasurementCount: actualCount,
      expectedMeasurementCount,
    };
  } catch (error) {
    logger.error(`Error checking sync status for mission ${missionId}:`, error);
    return {
      isSynced: false,
      hasOrphanedData: false,
      measurementsMismatch: false,
    };
  }
}

/**
 * Clean up orphaned missions (missions without measurements)
 */
export async function cleanupOrphanedMissions(): Promise<number> {
  try {
    // Find missions that have no measurements but claim to have some
    const { data: orphanedMissions, error } = await supabase
      .from('missions')
      .select(`
        id,
        name,
        measurements_count,
        measurements!inner(id)
      `)
      .gt('measurements_count', 0)
      .is('measurements.id', null);

    if (error) {
      logger.error('Error finding orphaned missions:', error);
      return 0;
    }

    if (!orphanedMissions || orphanedMissions.length === 0) {
      logger.debug('No orphaned missions found');
      return 0;
    }

    // Delete orphaned missions
    const orphanedIds = orphanedMissions.map(m => m.id);
    const { error: deleteError } = await supabase
      .from('missions')
      .delete()
      .in('id', orphanedIds);

    if (deleteError) {
      logger.error('Error deleting orphaned missions:', deleteError);
      return 0;
    }

    logger.info(`🧹 Cleaned up ${orphanedMissions.length} orphaned missions`);
    return orphanedMissions.length;
  } catch (error) {
    logger.error('Error in cleanupOrphanedMissions:', error);
    return 0;
  }
}

/**
 * Force re-sync of a specific mission
 */
export async function forceMissionResync(missionId: string): Promise<boolean> {
  try {
    // Delete existing measurements for this mission
    const { error: deleteMeasurementsError } = await supabase
      .from('measurements')
      .delete()
      .eq('mission_id', missionId);

    if (deleteMeasurementsError) {
      logger.error(`Error deleting measurements for mission ${missionId}:`, deleteMeasurementsError);
      return false;
    }

    // Delete existing events for this mission
    const { error: deleteEventsError } = await supabase
      .from('events')
      .delete()
      .eq('mission_id', missionId);

    if (deleteEventsError) {
      logger.error(`Error deleting events for mission ${missionId}:`, deleteEventsError);
      return false;
    }

    // Delete the mission itself
    const { error: deleteMissionError } = await supabase
      .from('missions')
      .delete()
      .eq('id', missionId);

    if (deleteMissionError) {
      logger.error(`Error deleting mission ${missionId}:`, deleteMissionError);
      return false;
    }

    logger.info(`🔄 Cleared mission ${missionId} for re-sync`);
    return true;
  } catch (error) {
    logger.error(`Error in forceMissionResync for ${missionId}:`, error);
    return false;
  }
}