import { useState, useEffect, useCallback } from 'react';
import { LocationData } from '@/types/PMScan';

export function useGPS() {
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
    if (!navigator.geolocation) {
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
      // Reduced GPS logging frequency
      if (Math.random() < 0.1) { // Only log 10% of updates
        console.log('📍 GPS position updated');
      }
    };

    const handleError = (error: GeolocationPositionError) => {
      // Suppress most GPS errors to keep console clean
      if (error.code === error.PERMISSION_DENIED && Math.random() < 0.1) {
        console.warn('GPS permission denied');
      }
      switch (error.code) {
        case error.PERMISSION_DENIED:
          setError('Location access denied');
          setLocationEnabled(false);
          break;
        case error.POSITION_UNAVAILABLE:
          setError('Location information unavailable');
          break;
        case error.TIMEOUT:
          // Don't set error for timeout - GPS might work later
          break;
        default:
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
  }, []);

  const requestLocationPermission = useCallback(async (): Promise<boolean> => {
    try {
      // Check if permissions API is available
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        
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