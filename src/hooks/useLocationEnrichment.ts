import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { invokeEdgeFunction } from '@/lib/supabaseEdge';

export interface LocationEnrichmentResult {
  enhanced_context: string | null;
  display_name?: string;
  source: 'cached' | 'nominatim';
  raw_data?: any;
}

export function useLocationEnrichment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enrichLocation = useCallback(async (
    latitude: number, 
    longitude: number, 
    timestamp?: string
  ): Promise<LocationEnrichmentResult | null> => {
    if (!latitude || !longitude) {
      setError('Invalid coordinates');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`🗺️ Enriching location: ${latitude}, ${longitude}`);
      
      const { data, error: enrichError } = await invokeEdgeFunction('enhance-location-context', {
        body: {
          latitude,
          longitude,
          timestamp: timestamp || new Date().toISOString()
        }
      });

      if (enrichError) {
        throw new Error(enrichError.message);
      }

      console.log('🗺️ Location enrichment result:', data);
      return data as LocationEnrichmentResult;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to enrich location';
      console.error('Location enrichment error:', errorMessage);
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const enrichLocationBatch = useCallback(async (
    locations: Array<{ latitude: number; longitude: number; timestamp?: string }>
  ): Promise<Array<LocationEnrichmentResult | null>> => {
    const results: Array<LocationEnrichmentResult | null> = [];
    
    // Process in batches to avoid overwhelming the API
    const batchSize = 5;
    for (let i = 0; i < locations.length; i += batchSize) {
      const batch = locations.slice(i, i + batchSize);
      const batchPromises = batch.map(loc => 
        enrichLocation(loc.latitude, loc.longitude, loc.timestamp)
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Small delay between batches to be respectful to Nominatim
      if (i + batchSize < locations.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }, [enrichLocation]);

  return {
    enrichLocation,
    enrichLocationBatch,
    loading,
    error
  };
}