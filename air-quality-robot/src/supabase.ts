// Polyfill for Node 16 - add global Headers API
import fetch, { Headers, Request, Response } from 'node-fetch';

// @ts-ignore
if (!globalThis.fetch) {
  // @ts-ignore
  globalThis.fetch = fetch;
  // @ts-ignore
  globalThis.Headers = Headers;
  // @ts-ignore
  globalThis.Request = Request;
  // @ts-ignore
  globalThis.Response = Response;
}

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

export async function getPendingMissions(cutoffDate?: string) {
  try {
    logger.info(`🔍 Getting pending missions with config: allowedDeviceIds=${JSON.stringify(config.device.allowedDeviceIds)}, unknownDeviceBehavior=${config.device.unknownDeviceBehavior}`);
    
    let query = supabase
      .from('missions')
      .select('*')
      .eq('processed_by_robot', false);

    // Filter by device ID at database level for efficiency
    if (config.device.allowedDeviceIds.length > 0) {
      if (config.device.unknownDeviceBehavior === 'skip') {
        // Only get missions from allowed devices (excludes null device names)
        query = query.in('device_name', config.device.allowedDeviceIds);
        logger.info(`🎯 Filtering database query to only include allowed devices: ${JSON.stringify(config.device.allowedDeviceIds)}`);
      }
    }

    // Only process missions created after cutoff date
    if (cutoffDate) {
      logger.info(`📅 Using cutoff date: ${cutoffDate}`);
      query = query.gte('created_at', cutoffDate);
    }

    logger.info('🚀 Executing database query...');
    const { data, error } = await query
      .order('created_at', { ascending: true })
      .limit(10);

    if (error) {
      logger.error('❌ Error fetching missions:', error.message);
      return [];
    }

    const missions = data || [];
    logger.info(`📊 Database query result: ${missions.length} missions found`);
    
    if (missions.length > 0) {
      logger.info('📋 Mission details:');
      missions.forEach(mission => {
        logger.info(`  - Mission ${mission.id}: device=${mission.device_name || 'null'}, created=${mission.created_at}`);
      });
    }

    if (cutoffDate) {
      logger.info(`✅ Found ${missions.length} pending missions (created after ${cutoffDate})`);
    } else {
      logger.info(`✅ Found ${missions.length} pending missions`);
    }
    
    return missions;
  } catch (error) {
    logger.error('Error in getPendingMissions:', error);
    return [];
  }
}

export async function markAllExistingMissionsAsProcessed(beforeDate: string) {
  try {
    const { count, error } = await supabase
      .from('missions')
      .update({ 
        processed_by_robot: true,
        robot_processed_at: new Date().toISOString()
      })
      .eq('processed_by_robot', false)
      .lt('created_at', beforeDate);

    if (error) {
      logger.error('Error marking existing missions as processed:', error.message);
      return 0;
    }

    const markedCount = count || 0;
    logger.info(`✅ Marked ${markedCount} existing missions as processed (created before ${beforeDate})`);
    return markedCount;
  } catch (error) {
    logger.error('Error in markAllExistingMissionsAsProcessed:', error);
    return 0;
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