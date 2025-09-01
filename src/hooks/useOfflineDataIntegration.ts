import { useCallback } from 'react';
import { offlineDataService } from '@/services/offlineDataService';
import { useOfflineStatus } from './useOfflineStatus';
import { PMScanData } from '@/lib/pmscan/types';
import { LocationData } from '@/types/PMScan';
import * as logger from '@/utils/logger';

/**
 * Hook to integrate offline data storage with existing recording flows
 */
export function useOfflineDataIntegration() {
  const { isOnline } = useOfflineStatus();

  const storeAirQualityOffline = useCallback(async (
    pmData: PMScanData,
    location?: LocationData,
    context?: any
  ) => {
    if (!isOnline) {
      await offlineDataService.storeAirQualityData(pmData, location, context);
      logger.debug('🗄️ Air quality data stored for offline sync');
    }
  }, [isOnline]);

  const storeMissionOffline = useCallback(async (missionData: any) => {
    if (!isOnline) {
      await offlineDataService.storeMissionData(missionData);
      logger.debug('🗄️ Mission data stored for offline sync');
    }
  }, [isOnline]);

  const shouldUseOfflineStorage = useCallback(() => {
    return !isOnline;
  }, [isOnline]);

  return {
    storeAirQualityOffline,
    storeMissionOffline,
    shouldUseOfflineStorage,
    isOnline
  };
}