/**
 * Location Enrichment Optimizer
 * Implements smart caching, movement detection, and predictive enrichment
 */

export interface LocationPoint {
  latitude: number;
  longitude: number;
  timestamp: string;
}

export interface EnrichmentCache {
  location: LocationPoint;
  context: string;
  displayName: string;
  quality: 'high' | 'medium' | 'low';
  expiresAt: number;
  hitCount: number;
  lastUsed: number;
}

export interface MovementPattern {
  locations: LocationPoint[];
  frequency: number;
  timeOfDay: string;
  dayOfWeek: number;
}

/**
 * Calculate distance between two GPS coordinates in meters
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Calculate movement speed in m/s
 */
export function calculateSpeed(point1: LocationPoint, point2: LocationPoint): number {
  const distance = calculateDistance(point1.latitude, point1.longitude, point2.latitude, point2.longitude);
  const timeDiff = (new Date(point2.timestamp).getTime() - new Date(point1.timestamp).getTime()) / 1000;
  return timeDiff > 0 ? distance / timeDiff : 0;
}

/**
 * Determine if user is stationary, walking, or in transport
 */
export function detectMovementState(recentPoints: LocationPoint[]): 'stationary' | 'walking' | 'transport' {
  if (recentPoints.length < 2) return 'stationary';
  
  const speeds = [];
  for (let i = 1; i < recentPoints.length; i++) {
    speeds.push(calculateSpeed(recentPoints[i-1], recentPoints[i]));
  }
  
  const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
  
  if (avgSpeed < 0.5) return 'stationary';
  if (avgSpeed < 5) return 'walking';
  return 'transport';
}

/**
 * Get cache radius based on location type and movement state
 */
export function getCacheRadius(movementState: string, locationQuality: string): number {
  const baseRadius = {
    stationary: { high: 50, medium: 100, low: 200 },
    walking: { high: 100, medium: 200, low: 400 },
    transport: { high: 500, medium: 1000, low: 2000 }
  };
  
  return baseRadius[movementState]?.[locationQuality] || 200;
}

/**
 * Get cache duration based on location type
 */
export function getCacheDuration(context: string): number {
  const baseDurations = {
    'Indoor restaurant': 4 * 60 * 60 * 1000, // 4 hours
    'Indoor hospital': 24 * 60 * 60 * 1000, // 24 hours  
    'Indoor school': 8 * 60 * 60 * 1000, // 8 hours
    'Indoor gym': 6 * 60 * 60 * 1000, // 6 hours
    'Outdoor transport': 30 * 60 * 1000, // 30 minutes
    'Outdoor at home': 12 * 60 * 60 * 1000, // 12 hours
    'Outdoor at work': 8 * 60 * 60 * 1000, // 8 hours
    'Outdoor': 2 * 60 * 60 * 1000 // 2 hours default
  };
  
  return baseDurations[context] || baseDurations['Outdoor'];
}

/**
 * Determine if API call is needed based on movement and cache
 */
export function shouldEnrichLocation(
  currentLocation: LocationPoint,
  recentLocations: LocationPoint[],
  cache: EnrichmentCache[]
): boolean {
  // Check movement state
  const movementState = detectMovementState([...recentLocations, currentLocation]);
  
  // If stationary, check if we have recent cache nearby
  if (movementState === 'stationary') {
    const nearbyCache = cache.find(entry => {
      const distance = calculateDistance(
        currentLocation.latitude, currentLocation.longitude,
        entry.location.latitude, entry.location.longitude
      );
      const radius = getCacheRadius(movementState, entry.quality);
      return distance <= radius && entry.expiresAt > Date.now();
    });
    
    if (nearbyCache) {
      nearbyCache.hitCount++;
      nearbyCache.lastUsed = Date.now();
      return false;
    }
  }
  
  // For walking/transport, use larger radius but check recency
  const radius = getCacheRadius(movementState, 'medium');
  const recentThreshold = movementState === 'transport' ? 15 * 60 * 1000 : 60 * 60 * 1000;
  
  const relevantCache = cache.find(entry => {
    const distance = calculateDistance(
      currentLocation.latitude, currentLocation.longitude,
      entry.location.latitude, entry.location.longitude
    );
    const isRecent = (Date.now() - entry.lastUsed) < recentThreshold;
    return distance <= radius && entry.expiresAt > Date.now() && isRecent;
  });
  
  return !relevantCache;
}

/**
 * Prioritize locations for enrichment based on importance
 */
export function prioritizeEnrichmentQueue(
  locations: LocationPoint[],
  patterns: MovementPattern[]
): LocationPoint[] {
  return locations.sort((a, b) => {
    // Prioritize frequent locations
    const aFreq = patterns.filter(p => 
      p.locations.some(loc => calculateDistance(a.latitude, a.longitude, loc.latitude, loc.longitude) < 100)
    ).length;
    
    const bFreq = patterns.filter(p => 
      p.locations.some(loc => calculateDistance(b.latitude, b.longitude, loc.latitude, loc.longitude) < 100)
    ).length;
    
    if (aFreq !== bFreq) return bFreq - aFreq;
    
    // Then prioritize by recency
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
}

/**
 * Clean expired cache entries
 */
export function cleanExpiredCache(cache: EnrichmentCache[]): EnrichmentCache[] {
  const now = Date.now();
  return cache.filter(entry => entry.expiresAt > now);
}

/**
 * Get network quality indicator
 */
export function getNetworkQuality(): 'slow' | 'fast' | 'offline' {
  if (!navigator.onLine) return 'offline';
  
  // Use connection API if available
  const connection = (navigator as any).connection;
  if (connection) {
    if (connection.effectiveType === '4g' || connection.effectiveType === '5g') return 'fast';
    if (connection.effectiveType === '3g') return 'fast';
    return 'slow';
  }
  
  return 'fast'; // Default assumption
}

/**
 * Get battery level if available
 */
export async function getBatteryLevel(): Promise<number> {
  try {
    const battery = await (navigator as any).getBattery?.();
    return battery?.level || 1;
  } catch {
    return 1; // Default to full battery
  }
}

/**
 * Determine if enrichment should be throttled based on device state
 */
export async function shouldThrottleEnrichment(): Promise<boolean> {
  const networkQuality = getNetworkQuality();
  const batteryLevel = await getBatteryLevel();
  
  // Throttle if offline
  if (networkQuality === 'offline') return true;
  
  // Throttle on low battery + slow network
  if (batteryLevel < 0.2 && networkQuality === 'slow') return true;
  
  return false;
}