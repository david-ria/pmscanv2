import { useEffect } from 'react';
import { useMissionEnrichment } from './useMissionEnrichment';
import * as logger from '@/utils/logger';

/**
 * Background enrichment hook that runs globally to enrich missions
 * with weather and air quality data without blocking the UI
 */
export function useBackgroundEnrichment() {
  const { enrichAllMissionsWithMissingData } = useMissionEnrichment();

  useEffect(() => {
    // Only run if online
    if (!navigator.onLine) {
      logger.debug('⏸️ Background enrichment skipped: offline');
      return;
    }

    // Delay enrichment to let UI settle and avoid blocking initial load
    const timer = setTimeout(() => {
      logger.debug('🔄 Starting background mission enrichment...');
      enrichAllMissionsWithMissingData()
        .then(() => {
          logger.debug('✅ Background enrichment completed');
        })
        .catch(error => {
          logger.error('❌ Background enrichment failed:', error);
        });
    }, 5000); // Wait 5 seconds after app loads

    return () => clearTimeout(timer);
  }, []); // Run only once on mount
}
