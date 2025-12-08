import { useState, useEffect, useCallback, useRef } from 'react';
import { LocationData } from '@/types/PMScan';
import { GeoSpeedEstimator } from '@/utils/geoSpeed';
import * as logger from '@/utils/logger';

// Throttle configuration for battery optimization
const LOCATION_UPDATE_THROTTLE_MS = 2000; // 2 seconds minimum between UI updates

export function useGPS(enabled: boolean = true, highAccuracy: boolean = false, recordingFrequency?: string) {
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [latestLocation, setLatestLocation] = useState<LocationData | null>(
    null
  );
  const [watchId, setWatchId] = useState<number | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastErrorTimeRef = useRef(0);
  
  // Throttle ref to prevent excessive UI updates
  const lastUpdateTimeRef = useRef<number>(0);
  
  // Speed estimator instance
  const speedEstimatorRef = useRef(new GeoSpeedEstimator());
  const [speedKmh, setSpeedKmh] = useState(0);
  const [gpsQuality, setGpsQuality] = useState<'good' | 'poor'>('good');

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setWatchId(null);
      logger.debug('🧭 GPS: Stopped watching position');
    }
  }, []);

  const startWatching = useCallback(() => {
    if (!enabled) {
      return;
    }

    // Ensure any previous watcher is cleared before starting a new one
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setWatchId(null);
    }

    if (!navigator.geolocation) {
      logger.error('🧭 GPS: Geolocation is not supported by this browser');
      setError('Geolocation is not supported by this browser');
      return;
    }

    // Battery optimization: Use maximumAge based on highAccuracy mode
    // - highAccuracy (recording): Fresh GPS, no caching
    // - low power (not recording): Allow cached positions up to 5 seconds
    const maximumAge = highAccuracy ? 0 : 5000;

    const options: PositionOptions = {
      enableHighAccuracy: highAccuracy,
      timeout: 60000, // 60 seconds - very long timeout
      maximumAge: maximumAge,
    };

    logger.debug('🧭 GPS: Starting watcher', { highAccuracy, maximumAge });

    const handleSuccess = (position: GeolocationPosition) => {
      const now = Date.now();
      
      // Throttle UI updates to prevent excessive re-renders (battery optimization)
      if (now - lastUpdateTimeRef.current < LOCATION_UPDATE_THROTTLE_MS) {
        return;
      }
      lastUpdateTimeRef.current = now;

      const locationData: LocationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude || undefined,
        timestamp: new Date(position.timestamp),
      };

      // Rate-limited diagnostic logging
      logger.rateLimitedInfo('gps-state-update', 10000, '🧭 GPS STATE UPDATE:', {
        lat: locationData.latitude.toFixed(6),
        lng: locationData.longitude.toFixed(6),
        timestamp: locationData.timestamp.toISOString(),
        positionTimestamp: position.timestamp
      });

      // Calculate speed and GPS quality using GeoSpeedEstimator
      const { speedKmh: newSpeed, gpsQuality: newQuality } = speedEstimatorRef.current.update({
        lat: position.coords.latitude,
        lon: position.coords.longitude,
        t: position.timestamp,
        acc: position.coords.accuracy
      });

      setSpeedKmh(newSpeed);
      setGpsQuality(newQuality);

      logger.rateLimitedDebug('gps-update', 10000,
        '🧭 GPS location updated', {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          accuracy: locationData.accuracy,
          speedKmh: newSpeed,
          gpsQuality: newQuality,
          timestamp: locationData.timestamp.toISOString()
        }
      );

      setLatestLocation(locationData);
      setError(null);
      setLocationEnabled(true);
    };

    const handleError = (error: GeolocationPositionError) => {
      const now = Date.now();
      
      // For timeout errors, only log once every 60 seconds (they're expected)
      const minInterval = error.code === error.TIMEOUT ? 60000 : 10000;
      
      if (now - lastErrorTimeRef.current < minInterval) {
        return;
      }
      lastErrorTimeRef.current = now;

      // Only log non-timeout errors to console
      if (error.code !== error.TIMEOUT) {
        logger.error('🧭 GPS: Error occurred:', new Error(error.message), {
          code: (error as any).code,
          message: error.message,
        });
      }

      switch (error.code) {
        case error.PERMISSION_DENIED:
          logger.debug('🧭 GPS: Permission denied');
          setError('Location access denied');
          setLocationEnabled(false);
          break;
        case error.POSITION_UNAVAILABLE:
          logger.debug('🧭 GPS: Position unavailable');
          setError('Location information unavailable');
          break;
        case error.TIMEOUT:
          // Timeout is normal - GPS might work later, don't log as error
          logger.debug('🧭 GPS: Timeout occurred (normal, will retry)');
          break;
        default:
          logger.debug('🧭 GPS: Unknown error');
          setError('Unknown GPS error');
          break;
      }
    };

    const id = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      options
    );

    watchIdRef.current = id;
    setWatchId(id);
  }, [enabled, highAccuracy, recordingFrequency]);

  const requestLocationPermission = useCallback(async (): Promise<boolean> => {
    logger.debug('🧭 GPS: Permission request initiated...');

    try {
      // Check if permissions API is available
      if ('permissions' in navigator) {
        logger.debug('🧭 GPS: Using permissions API');
        const permission = await navigator.permissions.query({
          name: 'geolocation',
        });
        logger.debug('🧭 GPS: Current permission state:', permission.state);

        if (permission.state === 'granted') {
          setLocationEnabled(true);
          // Trigger startWatching via state change instead of calling directly
          return true;
        } else if (permission.state === 'prompt') {
          // Will trigger permission dialog on first geolocation call
          return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                setLocationEnabled(true);
                // Trigger startWatching via state change instead of calling directly
                resolve(true);
              },
              (error) => {
                logger.warn('🧭 GPS: Permission denied:', error.message);
                setLocationEnabled(false);
                setError('Location permission denied');
                resolve(false);
              }
            );
          });
        } else {
          setError('Location permission permanently denied');
          return false;
        }
      } else {
        // Fallback for browsers without permissions API
        return new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              setLocationEnabled(true);
              // Trigger startWatching via state change instead of calling directly
              resolve(true);
            },
            (error) => {
              logger.warn('🧭 GPS: Permission denied (fallback):', error.message);
              setLocationEnabled(false);
              setError('Location permission denied');
              resolve(false);
            }
          );
        });
      }
    } catch (err) {
      logger.error('🧭 GPS: Error requesting location permission:', err);
      setError('Failed to request location permission');
      return false;
    }
  }, []);

  // Check initial permission state
  useEffect(() => {
    let isMounted = true;
    let permissionStatus: PermissionStatus | null = null;
    let permissionChangeHandler: (() => void) | null = null;

    if ('permissions' in navigator) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((permission) => {
          if (!isMounted) return;

          permissionStatus = permission;
          if (permission.state === 'granted') {
            setLocationEnabled(true);
          }

          permissionChangeHandler = () => {
            if (permission.state === 'granted') {
              setLocationEnabled(true);
            } else {
              setLocationEnabled(false);
              setLatestLocation(null);
            }
          };

          permission.addEventListener('change', permissionChangeHandler);
        });
    }

    return () => {
      isMounted = false;
      if (permissionStatus && permissionChangeHandler) {
        permissionStatus.removeEventListener('change', permissionChangeHandler);
      }
    };
  }, []);

  // Handle enabled state changes
  useEffect(() => {
    if (!enabled) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
        setWatchId(null);
      }
      setLocationEnabled(false);
      setLatestLocation(null);
      setError(null);
      // Reset speed estimator when GPS is disabled
      speedEstimatorRef.current.reset();
      setSpeedKmh(0);
      setGpsQuality('good');
    }
  }, [enabled]);

  // Start watching when enabled and location permission granted
  useEffect(() => {
    if (enabled && locationEnabled) {
      // Small delay to prevent rapid state changes
      const timer = setTimeout(() => {
        startWatching();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [enabled, locationEnabled, highAccuracy, recordingFrequency]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    locationEnabled,
    latestLocation,
    speedKmh,
    gpsQuality,
    error,
    requestLocationPermission,
  };
}
