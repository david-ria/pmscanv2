import { useCallback, useEffect } from 'react';
import { useLocationEnrichmentSettings } from './useLocationEnrichmentSettings';
import { useSmartLocationEnrichment } from './useSmartLocationEnrichment';
import { useGPS } from './useGPS';

/**
 * Integration hook that connects location enrichment with GPS and recording state
 */
export function useLocationEnrichmentIntegration() {
  const { isEnabled } = useLocationEnrichmentSettings();
  const { enrichLocation, preEnrichFrequentLocations } = useSmartLocationEnrichment();
  const { latestLocation } = useGPS(true, true);

  // Auto-enrich current location when enabled
  useEffect(() => {
    if (isEnabled && latestLocation) {
      const enrichWithDelay = setTimeout(() => {
        enrichLocation(
          latestLocation.latitude,
          latestLocation.longitude,
          new Date().toISOString()
        ).catch(console.error);
      }, 2000); // Small delay to avoid too frequent calls

      return () => clearTimeout(enrichWithDelay);
    }
  }, [isEnabled, latestLocation?.latitude, latestLocation?.longitude, enrichLocation]);

  // Periodic predictive enrichment
  useEffect(() => {
    if (!isEnabled) return;

    const interval = setInterval(() => {
      preEnrichFrequentLocations().catch(console.error);
    }, 10 * 60 * 1000); // Every 10 minutes

    return () => clearInterval(interval);
  }, [isEnabled, preEnrichFrequentLocations]);

  return {
    enrichLocation: isEnabled ? enrichLocation : null
  };
}