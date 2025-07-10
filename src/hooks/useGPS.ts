import { useState, useEffect, useCallback } from 'react';
import { LocationData } from '@/types/PMScan';

export function useGPS() {
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [latestLocation, setLatestLocation] = useState<LocationData | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastErrorTime, setLastErrorTime] = useState<number>(0);

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
      enableHighAccuracy: false,  // Less demanding on the system
      timeout: 30000,  // Increased timeout to 30 seconds
      maximumAge: 60000  // Accept cached position up to 1 minute old
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
      console.log('📍 GPS position updated:', locationData);
    };

    const handleError = (error: GeolocationPositionError) => {
      // Throttle error logging to prevent spam
      const now = Date.now();
      if (now - lastErrorTime > 10000) { // Only log every 10 seconds
        console.error('❌ GPS error:', error.message, 'Code:', error.code);
        setLastErrorTime(now);
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
          setError('Location request timed out');
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