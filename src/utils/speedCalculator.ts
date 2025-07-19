// Speed and movement calculation utilities for GPS data

interface LocationPoint {
  latitude: number;
  longitude: number;
  timestamp: Date;
}

interface SpeedData {
  speed: number; // km/h
  isMoving: boolean;
  acceleration: number; // m/s²
  distance: number; // meters from last point
}

// Store recent location history for speed calculation
let locationHistory: LocationPoint[] = [];
const MAX_HISTORY_POINTS = 10;
const MOVEMENT_THRESHOLD = 1; // km/h - below this is considered stationary

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
}

/**
 * Add a new location point and calculate current speed
 */
export function updateLocationHistory(
  latitude: number,
  longitude: number,
  timestamp: Date = new Date()
): SpeedData {
  const newPoint: LocationPoint = { latitude, longitude, timestamp };
  
  // Add to history
  locationHistory.push(newPoint);
  
  // Keep only recent points
  if (locationHistory.length > MAX_HISTORY_POINTS) {
    locationHistory = locationHistory.slice(-MAX_HISTORY_POINTS);
  }
  
  // Need at least 2 points to calculate speed
  if (locationHistory.length < 2) {
    return {
      speed: 0,
      isMoving: false,
      acceleration: 0,
      distance: 0
    };
  }
  
  const currentPoint = locationHistory[locationHistory.length - 1];
  const previousPoint = locationHistory[locationHistory.length - 2];
  
  // Calculate distance and time difference
  const distance = calculateDistance(
    previousPoint.latitude,
    previousPoint.longitude,
    currentPoint.latitude,
    currentPoint.longitude
  );
  
  const timeDiff = (currentPoint.timestamp.getTime() - previousPoint.timestamp.getTime()) / 1000; // seconds
  
  if (timeDiff <= 0) {
    return {
      speed: 0,
      isMoving: false,
      acceleration: 0,
      distance: 0
    };
  }
  
  // Calculate speed in km/h
  const speedMs = distance / timeDiff; // m/s
  const speedKmh = speedMs * 3.6; // km/h
  
  // Calculate acceleration (change in speed)
  let acceleration = 0;
  if (locationHistory.length >= 3) {
    const olderPoint = locationHistory[locationHistory.length - 3];
    const oldDistance = calculateDistance(
      olderPoint.latitude,
      olderPoint.longitude,
      previousPoint.latitude,
      previousPoint.longitude
    );
    const oldTimeDiff = (previousPoint.timestamp.getTime() - olderPoint.timestamp.getTime()) / 1000;
    
    if (oldTimeDiff > 0) {
      const oldSpeedMs = oldDistance / oldTimeDiff;
      acceleration = (speedMs - oldSpeedMs) / timeDiff; // m/s²
    }
  }
  
  // Smooth speed calculation using average of last few points for better accuracy
  const recentSpeeds: number[] = [];
  for (let i = 1; i < Math.min(locationHistory.length, 5); i++) {
    const curr = locationHistory[locationHistory.length - i];
    const prev = locationHistory[locationHistory.length - i - 1];
    
    const d = calculateDistance(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
    const t = (curr.timestamp.getTime() - prev.timestamp.getTime()) / 1000;
    
    if (t > 0) {
      recentSpeeds.push((d / t) * 3.6);
    }
  }
  
  // Use median speed for better noise filtering
  const smoothedSpeed = recentSpeeds.length > 0 
    ? recentSpeeds.sort((a, b) => a - b)[Math.floor(recentSpeeds.length / 2)]
    : speedKmh;
  
  const isMoving = smoothedSpeed > MOVEMENT_THRESHOLD;
  
  return {
    speed: Math.round(smoothedSpeed * 10) / 10, // Round to 1 decimal
    isMoving,
    acceleration: Math.round(acceleration * 100) / 100, // Round to 2 decimals
    distance: Math.round(distance * 10) / 10 // Round to 1 decimal
  };
}

/**
 * Get current movement statistics
 */
export function getCurrentMovementStats(): SpeedData | null {
  if (locationHistory.length < 2) {
    return null;
  }
  
  const currentPoint = locationHistory[locationHistory.length - 1];
  const previousPoint = locationHistory[locationHistory.length - 2];
  
  return updateLocationHistory(
    currentPoint.latitude,
    currentPoint.longitude,
    currentPoint.timestamp
  );
}

/**
 * Clear location history (useful when starting new recording session)
 */
export function clearLocationHistory(): void {
  locationHistory = [];
}

/**
 * Get location history for debugging
 */
export function getLocationHistory(): LocationPoint[] {
  return [...locationHistory];
}

/**
 * Detect if user is likely in a vehicle based on speed patterns
 */
export function detectVehicleType(speedData: SpeedData): string {
  const { speed, acceleration } = speedData;
  
  if (!speedData.isMoving) {
    return 'stationary';
  }
  
  if (speed < 5) {
    return 'walking';
  } else if (speed < 20) {
    // Could be cycling or slow vehicle
    if (Math.abs(acceleration) > 2) {
      return 'cycling'; // Bikes have more variable acceleration
    } else {
      return 'slow_vehicle';
    }
  } else if (speed < 50) {
    return 'city_driving';
  } else if (speed < 90) {
    return 'highway_driving';
  } else {
    return 'high_speed_transport'; // Train, plane, etc.
  }
}
