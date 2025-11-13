import { useCallback, useEffect } from 'react';
import { useLocationEnrichmentSettings } from './useLocationEnrichmentSettings';
import { useSmartLocationEnrichment } from './useSmartLocationEnrichment';
import { useUnifiedData } from '@/components/UnifiedDataProvider';
import { devLogger, rateLimitedDebug } from '@/utils/optimizedLogger';

/**
 * Integration hook that connects location enrichment with GPS and recording state
 */
export function useLocationEnrichmentIntegration() {
  const { isEnabled } = useLocationEnrichmentSettings();
  const { enrichLocation, preEnrichFrequentLocations } = useSmartLocationEnrichment();
  const { latestLocation } = useUnifiedData();

  // Rate limited state logging
  rateLimitedDebug('enrichment-integration-state', 15000, '🔧 Enrichment integration state:', {
    isEnabled,
    hasEnrichFunction: !!enrichLocation,
    hasLocation: !!latestLocation
  });

  // Auto-enrich current location when enabled and online
  useEffect(() => {
    if (isEnabled && latestLocation && navigator.onLine) {
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

  // Periodic predictive enrichment (only when online)
  useEffect(() => {
    if (!isEnabled) return;

    const interval = setInterval(() => {
      if (navigator.onLine) {
        preEnrichFrequentLocations().catch(console.error);
      }
    }, 10 * 60 * 1000); // Every 10 minutes

    return () => clearInterval(interval);
  }, [isEnabled, preEnrichFrequentLocations]);

  // Development-only return logging
  devLogger.debug('🔧 Enrichment integration returning function:', { 
    isEnabled, 
    hasFunction: !!enrichLocation 
  });

  return {
    enrichLocation: isEnabled ? enrichLocation : null
  };
}