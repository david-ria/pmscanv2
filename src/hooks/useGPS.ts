import { useState, useEffect, useCallback, useRef } from 'react';
import { LocationData } from '@/types/PMScan';
import * as logger from '@/utils/logger';

export function useGPS(enabled: boolean = true) {
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [latestLocation, setLatestLocation] = useState<LocationData | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stopWatching = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
  }, [watchId]);

  const startWatching = useCallback(() => {
    if (!enabled) {
      return;
    }

    // Ensure any previous watcher is cleared before starting a new one
    if (watchId !== null) {
      stopWatching();
    }
    
    if (!navigator.geolocation) {
      console.error('🧭 GPS: Geolocation is not supported by this browser');
      setError('Geolocation is not supported by this browser');
      return;
    }

    const options: PositionOptions = {
      enableHighAccuracy: false,
      timeout: 60000, // 60 seconds - very long timeout
      maximumAge: 60000 // Cache for 60 seconds to reduce requests
    };

    const handleSuccess = (position: GeolocationPosition) => {
      const locationData: LocationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude || undefined,
        timestamp: new Date()
      };
      
      setLatestLocation(locationData);
      setError(null);
      setLocationEnabled(true);
    };

    const lastErrorTimeRef = useRef(0);

    const handleError = (error: GeolocationPositionError) => {
      const now = Date.now();
      if (now - lastErrorTimeRef.current < 10000) {
        return;
      }
      lastErrorTimeRef.current = now;

      logger.error('🧭 GPS: Error occurred:', {
        code: error.code,
        message: error.message,
        PERMISSION_DENIED: error.PERMISSION_DENIED,
        POSITION_UNAVAILABLE: error.POSITION_UNAVAILABLE,
        TIMEOUT: error.TIMEOUT
      });
      
      switch (error.code) {
        case error.PERMISSION_DENIED:
          console.error('🧭 GPS: Permission denied');
          setError('Location access denied');
          setLocationEnabled(false);
          break;
        case error.POSITION_UNAVAILABLE:
          console.error('🧭 GPS: Position unavailable');
          setError('Location information unavailable');
          break;
        case error.TIMEOUT:
          console.warn('🧭 GPS: Timeout occurred');
          // Don't set error for timeout - GPS might work later
          break;
        default:
          console.error('🧭 GPS: Unknown error');
          setError('Unknown GPS error');
          break;
      }
    };

    const id = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      options
    );
    
    setWatchId(id);
  }, [enabled, watchId, stopWatching]);

  const requestLocationPermission = useCallback(async (): Promise<boolean> => {
    logger.debug('🧭 GPS: Permission request initiated...');
    
    try {
      // Check if permissions API is available
      if ('permissions' in navigator) {
        logger.debug('🧭 GPS: Using permissions API');
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        logger.debug('🧭 GPS: Current permission state:', permission.state);
        
        if (permission.state === 'granted') {
          setLocationEnabled(true);
          startWatching();
          return true;
        } else if (permission.state === 'prompt') {
          // Will trigger permission dialog on first geolocation call
          return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                setLocationEnabled(true);
                startWatching();
                resolve(true);
              },
              (error) => {
                console.error('Permission denied:', error);
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
              startWatching();
              resolve(true);
            },
            (error) => {
              console.error('Permission denied:', error);
              setLocationEnabled(false);
              setError('Location permission denied');
              resolve(false);
            }
          );
        });
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
      setError('Failed to request location permission');
      return false;
    }
  }, [startWatching]);

  // Check initial permission state
  useEffect(() => {
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then((permission) => {
        if (permission.state === 'granted') {
          setLocationEnabled(true);
          startWatching();
        }
        
        // Listen for permission changes
        permission.addEventListener('change', () => {
          if (permission.state === 'granted') {
            setLocationEnabled(true);
            startWatching();
          } else {
            setLocationEnabled(false);
            stopWatching();
            setLatestLocation(null);
          }
        });
      });
    }
  }, [startWatching, stopWatching]);

  // Handle enabled state changes
  useEffect(() => {
    if (!enabled) {
      stopWatching();
      setLocationEnabled(false);
      setLatestLocation(null);
      setError(null);
    }
  }, [enabled, stopWatching]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopWatching();
    };
  }, [stopWatching]);

  return {
    locationEnabled,
    latestLocation,
    error,
    requestLocationPermission
  };
}