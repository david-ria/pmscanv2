import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  LocationPoint, 
  EnrichmentCache, 
  MovementPattern,
  shouldEnrichLocation,
  prioritizeEnrichmentQueue,
  cleanExpiredCache,
  getCacheDuration,
  calculateDistance,
  shouldThrottleEnrichment,
  getNetworkQuality
} from '@/utils/locationOptimizer';
import { devLogger, rateLimitedDebug } from '@/utils/optimizedLogger';

export interface SmartEnrichmentResult {
  enhanced_context: string | null;
  display_name?: string;
  source: 'cache' | 'local-cache' | 'nominatim';
  raw_data?: any;
  confidence: number;
}

const CACHE_STORAGE_KEY = 'locationEnrichmentCache';
const PATTERNS_STORAGE_KEY = 'locationMovementPatterns';
const MAX_CACHE_SIZE = 100;
const MAX_LOCATION_HISTORY = 50;

export function useSmartLocationEnrichment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cache, setCache] = useState<EnrichmentCache[]>([]);
  const [recentLocations, setRecentLocations] = useState<LocationPoint[]>([]);
  const [patterns, setPatterns] = useState<MovementPattern[]>([]);
  const enrichmentQueue = useRef<LocationPoint[]>([]);
  const isProcessingQueue = useRef(false);

  // Load cache and patterns from localStorage
  useEffect(() => {
    const savedCache = localStorage.getItem(CACHE_STORAGE_KEY);
    const savedPatterns = localStorage.getItem(PATTERNS_STORAGE_KEY);
    
    if (savedCache) {
      try {
        const parsed = JSON.parse(savedCache);
        setCache(cleanExpiredCache(parsed));
      } catch (error) {
        console.error('Failed to parse location cache:', error);
      }
    }
    
    if (savedPatterns) {
      try {
        setPatterns(JSON.parse(savedPatterns));
      } catch (error) {
        console.error('Failed to parse movement patterns:', error);
      }
    }
  }, []);

  // Save cache to localStorage
  useEffect(() => {
    localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(cache));
  }, [cache]);

  // Save patterns to localStorage
  useEffect(() => {
    localStorage.setItem(PATTERNS_STORAGE_KEY, JSON.stringify(patterns));
  }, [patterns]);

  // Process enrichment queue
  useEffect(() => {
    const processQueue = async () => {
      if (isProcessingQueue.current || enrichmentQueue.current.length === 0) return;
      
      isProcessingQueue.current = true;
      
      try {
        const shouldThrottle = await shouldThrottleEnrichment();
        if (shouldThrottle) {
          devLogger.debug('Throttling location enrichment due to device state');
          return;
        }
        
        const networkQuality = getNetworkQuality();
        const batchSize = networkQuality === 'fast' ? 3 : 1;
        
        const prioritized = prioritizeEnrichmentQueue(enrichmentQueue.current, patterns);
        const batch = prioritized.splice(0, batchSize);
        
        for (const location of batch) {
          await enrichLocationFromAPI(location);
          // Delay between calls to respect Nominatim rate limits
          await new Promise(resolve => setTimeout(resolve, networkQuality === 'fast' ? 500 : 1500));
        }
        
        enrichmentQueue.current = prioritized;
      } finally {
        isProcessingQueue.current = false;
      }
    };
    
    const interval = setInterval(processQueue, 2000);
    return () => clearInterval(interval);
  }, [patterns]);

  const addToCache = useCallback((
    location: LocationPoint,
    context: string,
    displayName: string,
    quality: 'high' | 'medium' | 'low' = 'medium'
  ) => {
    const expiresAt = Date.now() + getCacheDuration(context);
    
    setCache(prev => {
      const updated = [...prev, {
        location,
        context,
        displayName,
        quality,
        expiresAt,
        hitCount: 1,
        lastUsed: Date.now()
      }];
      
      // Limit cache size
      if (updated.length > MAX_CACHE_SIZE) {
        return updated
          .sort((a, b) => b.hitCount * b.lastUsed - a.hitCount * a.lastUsed)
          .slice(0, MAX_CACHE_SIZE);
      }
      
      return updated;
    });
  }, []);

  const findInCache = useCallback((location: LocationPoint): EnrichmentCache | null => {
    const cleanedCache = cleanExpiredCache(cache);
    if (cleanedCache.length !== cache.length) {
      setCache(cleanedCache);
    }
    
    return cleanedCache.find(entry => {
      const distance = calculateDistance(
        location.latitude, location.longitude,
        entry.location.latitude, entry.location.longitude
      );
      return distance <= 100 && entry.expiresAt > Date.now();
    }) || null;
  }, [cache]);

  const enrichLocationFromAPI = useCallback(async (
    location: LocationPoint
  ): Promise<SmartEnrichmentResult | null> => {
    try {
      devLogger.debug('API enriching location', `${location.latitude}, ${location.longitude}`);
      
      const { data, error: enrichError } = await supabase.functions.invoke('enhance-location-context', {
        body: {
          latitude: location.latitude,
          longitude: location.longitude,
          timestamp: location.timestamp,
          useSmartCaching: true
        }
      });

      if (enrichError) {
        throw new Error(enrichError.message);
      }

      if (data?.enhanced_context) {
        addToCache(location, data.enhanced_context, data.display_name || '', 'high');
      }

      return {
        ...data,
        source: 'nominatim',
        confidence: 0.9
      } as SmartEnrichmentResult;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to enrich location';
      console.error('API location enrichment error:', errorMessage);
      setError(errorMessage);
      return null;
    }
  }, [addToCache]);

  const enrichLocation = useCallback(async (
    latitude: number, 
    longitude: number, 
    timestamp?: string
  ): Promise<SmartEnrichmentResult | null> => {
    if (!latitude || !longitude) {
      setError('Invalid coordinates');
      return null;
    }

    const location: LocationPoint = {
      latitude,
      longitude,
      timestamp: timestamp || new Date().toISOString()
    };

    setLoading(true);
    setError(null);

    try {
      // Update recent locations
      setRecentLocations(prev => {
        const updated = [...prev, location];
        return updated.slice(-MAX_LOCATION_HISTORY);
      });

      // Check local cache first
      const cached = findInCache(location);
      if (cached) {
        devLogger.debug('Using local cache for location enrichment');
        cached.hitCount++;
        cached.lastUsed = Date.now();
        
        return {
          enhanced_context: cached.context,
          display_name: cached.displayName,
          source: 'local-cache',
          confidence: Math.min(0.8 + (cached.hitCount * 0.05), 0.95)
        };
      }

      // Check if we should enrich now or queue for later
      const shouldEnrichNow = shouldEnrichLocation(location, recentLocations, cache);
      
      if (!shouldEnrichNow) {
        // Add to queue for background processing
        enrichmentQueue.current.push(location);
        devLogger.debug('Added location to enrichment queue');
        
        // Return best guess from nearby cache
        const nearbyCache = cache
          .filter(entry => {
            const distance = calculateDistance(
              latitude, longitude,
              entry.location.latitude, entry.location.longitude
            );
            return distance <= 500;
          })
          .sort((a, b) => {
            const distA = calculateDistance(latitude, longitude, a.location.latitude, a.location.longitude);
            const distB = calculateDistance(latitude, longitude, b.location.latitude, b.location.longitude);
            return distA - distB;
          })[0];
        
        if (nearbyCache) {
          return {
            enhanced_context: nearbyCache.context,
            display_name: nearbyCache.displayName,
            source: 'local-cache',
            confidence: 0.6
          };
        }
      }

      // Enrich immediately for important locations
      return await enrichLocationFromAPI(location);

    } finally {
      setLoading(false);
    }
  }, [findInCache, recentLocations, cache, enrichLocationFromAPI]);

  const preEnrichFrequentLocations = useCallback(async () => {
    devLogger.debug('Starting predictive enrichment for frequent locations');
    
    // Identify frequent locations from patterns
    const frequentLocations = patterns
      .filter(pattern => pattern.frequency > 3)
      .flatMap(pattern => pattern.locations)
      .filter(location => !findInCache(location));
    
    // Add to queue for background processing
    enrichmentQueue.current.push(...frequentLocations);
  }, [patterns, findInCache]);

  const updateMovementPatterns = useCallback((location: LocationPoint) => {
    const hour = new Date(location.timestamp).getHours();
    const dayOfWeek = new Date(location.timestamp).getDay();
    const timeOfDay = hour < 6 ? 'night' : hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    
    setPatterns(prev => {
      // Find or create pattern for this time/day
      const existingPattern = prev.find(p => 
        p.timeOfDay === timeOfDay && 
        p.dayOfWeek === dayOfWeek &&
        p.locations.some(loc => calculateDistance(
          location.latitude, location.longitude,
          loc.latitude, loc.longitude
        ) < 200)
      );
      
      if (existingPattern) {
        existingPattern.frequency++;
        return [...prev];
      } else {
        return [...prev, {
          locations: [location],
          frequency: 1,
          timeOfDay,
          dayOfWeek
        }];
      }
    });
  }, []);

  // Auto-update patterns
  useEffect(() => {
    if (recentLocations.length > 0) {
      const latest = recentLocations[recentLocations.length - 1];
      updateMovementPatterns(latest);
    }
  }, [recentLocations, updateMovementPatterns]);

  // Rate-limited state logging for debugging
  rateLimitedDebug(
    'smart-location-enrichment-state',
    15000,
    '🔧 SmartLocationEnrichment state:', {
      hasEnrichLocation: !!enrichLocation,
      loading,
      error: !!error,
      cacheSize: cache.length,
      queueSize: enrichmentQueue.current.length
    }
  );

  return {
    enrichLocation,
    preEnrichFrequentLocations,
    loading,
    error,
    cacheSize: cache.length,
    queueSize: enrichmentQueue.current.length
  };
}