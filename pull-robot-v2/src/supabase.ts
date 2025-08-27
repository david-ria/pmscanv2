import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';
import { logger } from './logger.js';

export const supabase = createClient(config.supabase.url, config.supabase.key);

export async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('missions')
      .select('id')
      .limit(1);
    
    if (error) {
      logger.error('Supabase connection test failed:', error.message);
      return false;
    }
    
    logger.info('✅ Supabase connection successful');
    return true;
  } catch (error) {
    logger.error('Supabase connection error:', error);
    return false;
  }
}

export async function getPendingMissions() {
  try {
    const { data, error } = await supabase
      .from('missions')
      .select('*')
      .eq('processed_by_robot', false)
      .order('created_at', { ascending: true })
      .limit(10);

    if (error) {
      logger.error('Error fetching missions:', error.message);
      return [];
    }

    logger.info(`Found ${data?.length || 0} pending missions`);
    return data || [];
  } catch (error) {
    logger.error('Error in getPendingMissions:', error);
    return [];
  }
}

export async function markMissionProcessed(missionId: string) {
  try {
    const { error } = await supabase
      .from('missions')
      .update({ 
        processed_by_robot: true,
        robot_processed_at: new Date().toISOString()
      })
      .eq('id', missionId);

    if (error) {
      logger.error(`Error marking mission ${missionId} processed:`, error.message);
      return false;
    }

    logger.info(`✅ Mission ${missionId} marked as processed`);
    return true;
  } catch (error) {
    logger.error(`Error in markMissionProcessed for ${missionId}:`, error);
    return false;
  }
}