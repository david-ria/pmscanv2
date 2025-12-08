import { useCallback, useEffect } from 'react';
import { useLocationEnrichmentSettings } from './useLocationEnrichmentSettings';
import { useSmartLocationEnrichment } from './useSmartLocationEnrichment';
import { useUnifiedData } from '@/components/UnifiedDataProvider';
import * as logger from '@/utils/logger';

/**
 * Integration hook that connects location enrichment with GPS and recording state
 */
export function useLocationEnrichmentIntegration() {
  const { isEnabled } = useLocationEnrichmentSettings();
  const { enrichLocation, preEnrichFrequentLocations } = useSmartLocationEnrichment();
  const { latestLocation } = useUnifiedData();

  // Auto-enrich current location when enabled and online
  useEffect(() => {
    if (isEnabled && latestLocation && navigator.onLine) {
      const enrichWithDelay = setTimeout(() => {
        enrichLocation(
          latestLocation.latitude,
          latestLocation.longitude,
          new Date().toISOString()
        ).catch((err) => logger.error('Enrichment failed', err));
      }, 2000); // Small delay to avoid too frequent calls

      return () => clearTimeout(enrichWithDelay);
    }
  }, [isEnabled, latestLocation?.latitude, latestLocation?.longitude, enrichLocation]);

  // Periodic predictive enrichment (only when online)
  useEffect(() => {
    if (!isEnabled) return;

    const interval = setInterval(() => {
      if (navigator.onLine) {
        preEnrichFrequentLocations().catch((err) => logger.error('Pre-enrichment failed', err));
      }
    }, 10 * 60 * 1000); // Every 10 minutes

    return () => clearInterval(interval);
  }, [isEnabled, preEnrichFrequentLocations]);

  return {
    enrichLocation: isEnabled ? enrichLocation : null
  };
}
