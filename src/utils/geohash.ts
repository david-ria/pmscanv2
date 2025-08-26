/**
 * Geohash encoding and decoding utilities
 * Implementation based on the Geohash algorithm for spatial indexing
 */

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

export interface GeohashBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface GeohashNeighbors {
  north: string;
  south: string;
  east: string;
  west: string;
}

export const GEOHASH_PRECISION_LEVELS = {
  CITY: 4,      // ~20km x 20km
  DISTRICT: 5,  // ~2.4km x 4.9km  
  NEIGHBORHOOD: 6, // ~610m x 1.2km
  BLOCK: 7,     // ~76m x 153m
  BUILDING: 8,  // ~19m x 38m
  ROOM: 9,      // ~2.4m x 4.8m
  PRECISE: 10,  // ~60cm x 1.2m
  EXACT: 11,    // ~7.5cm x 15cm
  MAX: 12       // ~1.9cm x 3.7cm
} as const;

/**
 * Encodes latitude and longitude into a geohash string
 */
export function encodeGeohash(latitude: number, longitude: number, precision: number = 8): string {
  if (latitude < -90 || latitude > 90) {
    throw new Error('Latitude must be between -90 and 90');
  }
  if (longitude < -180 || longitude > 180) {
    throw new Error('Longitude must be between -180 and 180');
  }
  if (precision < 1 || precision > 12) {
    throw new Error('Precision must be between 1 and 12');
  }

  let latRange = [-90.0, 90.0];
  let lngRange = [-180.0, 180.0];
  let geohash = '';
  let bits = 0;
  let bit = 0;
  let even = true; // Start with longitude

  while (geohash.length < precision) {
    if (even) {
      // Process longitude
      const mid = (lngRange[0] + lngRange[1]) / 2;
      if (longitude >= mid) {
        bit = (bit << 1) | 1;
        lngRange[0] = mid;
      } else {
        bit = bit << 1;
        lngRange[1] = mid;
      }
    } else {
      // Process latitude
      const mid = (latRange[0] + latRange[1]) / 2;
      if (latitude >= mid) {
        bit = (bit << 1) | 1;
        latRange[0] = mid;
      } else {
        bit = bit << 1;
        latRange[1] = mid;
      }
    }

    even = !even;
    bits++;

    if (bits === 5) {
      geohash += BASE32[bit];
      bits = 0;
      bit = 0;
    }
  }

  return geohash;
}

/**
 * Decodes a geohash string back to latitude and longitude bounds
 */
export function decodeGeohash(geohash: string): GeohashBounds {
  if (!geohash || typeof geohash !== 'string') {
    throw new Error('Invalid geohash string');
  }

  let latRange = [-90.0, 90.0];
  let lngRange = [-180.0, 180.0];
  let even = true; // Start with longitude

  for (const char of geohash) {
    const idx = BASE32.indexOf(char);
    if (idx === -1) {
      throw new Error(`Invalid character in geohash: ${char}`);
    }

    for (let i = 4; i >= 0; i--) {
      const bit = (idx >> i) & 1;
      if (even) {
        // Process longitude
        const mid = (lngRange[0] + lngRange[1]) / 2;
        if (bit === 1) {
          lngRange[0] = mid;
        } else {
          lngRange[1] = mid;
        }
      } else {
        // Process latitude
        const mid = (latRange[0] + latRange[1]) / 2;
        if (bit === 1) {
          latRange[0] = mid;
        } else {
          latRange[1] = mid;
        }
      }
      even = !even;
    }
  }

  return {
    minLat: latRange[0],
    maxLat: latRange[1],
    minLng: lngRange[0],
    maxLng: lngRange[1],
  };
}

/**
 * Gets the center point of a geohash
 */
export function getGeohashCenter(geohash: string): { latitude: number; longitude: number } {
  const bounds = decodeGeohash(geohash);
  return {
    latitude: (bounds.minLat + bounds.maxLat) / 2,
    longitude: (bounds.minLng + bounds.maxLng) / 2,
  };
}

/**
 * Gets the approximate accuracy/error for a given geohash precision
 */
export function getGeohashAccuracy(precision: number): { latError: number; lngError: number } {
  const bounds = decodeGeohash('0'.repeat(precision));
  return {
    latError: (bounds.maxLat - bounds.minLat) / 2,
    lngError: (bounds.maxLng - bounds.minLng) / 2,
  };
}

/**
 * Gets neighboring geohashes (useful for spatial queries)
 */
export function getGeohashNeighbors(geohash: string): GeohashNeighbors {
  const bounds = decodeGeohash(geohash);
  const latDiff = bounds.maxLat - bounds.minLat;
  const lngDiff = bounds.maxLng - bounds.minLng;
  const center = getGeohashCenter(geohash);
  const precision = geohash.length;

  return {
    north: encodeGeohash(center.latitude + latDiff, center.longitude, precision),
    south: encodeGeohash(center.latitude - latDiff, center.longitude, precision),
    east: encodeGeohash(center.latitude, center.longitude + lngDiff, precision),
    west: encodeGeohash(center.latitude, center.longitude - lngDiff, precision),
  };
}

/**
 * Validates if a string is a valid geohash
 */
export function isValidGeohash(geohash: string): boolean {
  if (!geohash || typeof geohash !== 'string') {
    return false;
  }
  
  for (const char of geohash) {
    if (BASE32.indexOf(char) === -1) {
      return false;
    }
  }
  
  return true;
}

/**
 * Gets a human-readable description of geohash precision level
 */
export function getGeohashPrecisionDescription(precision: number): string {
  switch (precision) {
    case GEOHASH_PRECISION_LEVELS.CITY:
      return 'City level (~20km)';
    case GEOHASH_PRECISION_LEVELS.DISTRICT:
      return 'District level (~2.4km)';
    case GEOHASH_PRECISION_LEVELS.NEIGHBORHOOD:
      return 'Neighborhood level (~610m)';
    case GEOHASH_PRECISION_LEVELS.BLOCK:
      return 'Block level (~76m)';
    case GEOHASH_PRECISION_LEVELS.BUILDING:
      return 'Building level (~19m)';
    case GEOHASH_PRECISION_LEVELS.ROOM:
      return 'Room level (~2.4m)';
    case GEOHASH_PRECISION_LEVELS.PRECISE:
      return 'Precise level (~60cm)';
    case GEOHASH_PRECISION_LEVELS.EXACT:
      return 'Exact level (~7.5cm)';
    case GEOHASH_PRECISION_LEVELS.MAX:
      return 'Maximum level (~1.9cm)';
    default:
      return `Level ${precision}`;
  }
}