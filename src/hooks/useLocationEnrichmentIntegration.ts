import { useCallback, useEffect } from 'react';
import { useLocationEnrichmentSettings } from './useLocationEnrichmentSettings';
import { useSmartLocationEnrichment } from './useSmartLocationEnrichment';
import { useGPS } from './useGPS';
import { devLogger, rateLimitedDebug } from '@/utils/optimizedLogger';

/**
 * Integration hook that connects location enrichment with GPS and recording state
 */
export function useLocationEnrichmentIntegration() {
  const { isEnabled } = useLocationEnrichmentSettings();
  const { enrichLocation, preEnrichFrequentLocations } = useSmartLocationEnrichment();
  const { latestLocation } = useGPS(true, true);

  // Rate-limited state logging - only when enabled
  if (isEnabled) {
    rateLimitedDebug(
      'location-enrichment-integration-state',
      10000,
      '🔧 LocationEnrichmentIntegration state:', {
        isEnabled,
        hasEnrichFunction: !!enrichLocation,
        hasLocation: !!latestLocation
      }
    );
  }

  // Auto-enrich current location when enabled
  useEffect(() => {
    if (isEnabled && latestLocation) {
      const enrichWithDelay = setTimeout(() => {
        enrichLocation(
          latestLocation.latitude,
          latestLocation.longitude,
          new Date().toISOString()
        ).catch((error) => {
          console.error('Location enrichment error:', error);
        });
      }, 2000); // Small delay to avoid too frequent calls

      return () => clearTimeout(enrichWithDelay);
    }
  }, [isEnabled, latestLocation?.latitude, latestLocation?.longitude, enrichLocation]);

  // Periodic predictive enrichment
  useEffect(() => {
    if (!isEnabled) return;

    const interval = setInterval(() => {
      preEnrichFrequentLocations().catch((error) => {
        devLogger.debug('Predictive enrichment error:', error);
      });
    }, 10 * 60 * 1000); // Every 10 minutes

    return () => clearInterval(interval);
  }, [isEnabled, preEnrichFrequentLocations]);

  // Only log return state in development when enabled
  if (isEnabled) {
    devLogger.debug('LocationEnrichmentIntegration returning', {
      hasEnrichFunction: !!enrichLocation,
      isEnabled
    });
  }

  return {
    enrichLocation: isEnabled ? enrichLocation : null
  };
}